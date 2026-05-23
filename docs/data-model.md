# Modelo de datos por servicio

Documento que define las bases de datos, esquemas y patrones de datos para los microservicios. Está alineado con la sección §3.3 (Microservicios) y la sección 5.1 (Esquema de Base de Datos) del design doc.

**Principio rector**: **Database per Service** — cada microservicio es dueño exclusivo de su DB y nadie más la lee/escribe directamente. La comunicación entre servicios es por API (gRPC interno) o por eventos (SNS+SQS).

## Resumen por servicio

| Servicio                | DB primaria              | Justificación                                                                                                            | DB secundaria            |
| ----------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| **problems-service**    | PostgreSQL (RDS)         | Datos relacionales (problem ↔ test_cases ↔ code_templates), queries con filtros, transacciones.                          | Redis (cache de detalle) |
| **submissions-service** | PostgreSQL (RDS)         | Historial inmutable con queries por user/problem/contest, joins con `submission_test_results`.                           | Redis (envíos recientes) |
| **users-service**       | PostgreSQL (RDS)         | Perfil + stats con relaciones simples, queries por username/email únicos.                                                | —                        |
| **contests-service**    | PostgreSQL (RDS) + Redis | Postgres para metadata y enrollments persistentes; Redis (Sorted Set) para leaderboard en tiempo real con baja latencia. | Redis (leaderboard live) |

No usamos NoSQL en este sistema. La cardinalidad de relaciones (user → submissions, user → contest_enrollments, contest → problems) y la necesidad de queries por múltiples atributos (status + filtros) hacen que el modelo relacional sea el natural. Las latencias requeridas (API < 200 ms p99) son alcanzables con índices + cache de Redis donde corresponda.

---

## users-service

**Tipo de DB**: PostgreSQL en AWS RDS (instancia dedicada para este servicio).

**Por qué relacional**: el perfil tiene relaciones uno-a-uno con stats agregados, queries por username/email únicos, índices por rating para leaderboard global. No hay necesidad de schemaless ni de alto volumen de escrituras concurrentes que justifique NoSQL.

**Por qué instancia separada (vs schema compartido)**: aislamiento de fallos, posibilidad de escalar lectura independientemente (read replicas si crece), no comparte conexiones con otros servicios.

### Esquema

#### `users`

| Columna              | Tipo          | Restricciones           | Descripción                                                                                |
| -------------------- | ------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| `id`                 | UUID          | PK, NOT NULL            | Coincide con el claim `sub` del JWT emitido por Authentik. **Nunca se genera localmente**. |
| `username`           | VARCHAR(50)   | UNIQUE, NOT NULL        | Identificador público. Inmutable después de creado.                                        |
| `display_name`       | VARCHAR(100)  |                         | Nombre visible (puede cambiar).                                                            |
| `email`              | VARCHAR(255)  | UNIQUE, NOT NULL        | Sincronizado desde Authentik en el primer login.                                           |
| `avatar_url`         | VARCHAR(500)  |                         | URL a S3 o gravatar.                                                                       |
| `bio`                | TEXT          |                         | Biografía corta.                                                                           |
| `country_code`       | CHAR(2)       |                         | ISO 3166-1 alpha-2.                                                                        |
| `preferred_language` | language_enum |                         | Lenguaje preferido para soluciones (mismo enum que `submissions.language`).                |
| `rating`             | INTEGER       | NOT NULL, default 1500  | Rating tipo ELO. Se actualiza al cerrar cada contest.                                      |
| `is_active`          | BOOLEAN       | NOT NULL, default true  | Soft delete.                                                                               |
| `created_at`         | TIMESTAMPTZ   | NOT NULL, default now() |                                                                                            |
| `updated_at`         | TIMESTAMPTZ   | NOT NULL, default now() |                                                                                            |

**Índices**:

- `idx_users_username` UNIQUE (`username`)
- `idx_users_email` UNIQUE (`email`)
- `idx_users_rating_desc` (`rating` DESC) WHERE `is_active = true` — para leaderboard global de usuarios.

#### `user_stats`

Tabla denormalizada para queries rápidos de perfil (`GET /v1/users/{id}/stats`). Se actualiza vía eventos (no se calcula on-read).

| Columna                  | Tipo         | Restricciones           | Descripción                                                      |
| ------------------------ | ------------ | ----------------------- | ---------------------------------------------------------------- |
| `user_id`                | UUID         | PK, FK → `users.id`     |                                                                  |
| `problems_solved_easy`   | INTEGER      | NOT NULL, default 0     |                                                                  |
| `problems_solved_medium` | INTEGER      | NOT NULL, default 0     |                                                                  |
| `problems_solved_hard`   | INTEGER      | NOT NULL, default 0     |                                                                  |
| `total_submissions`      | INTEGER      | NOT NULL, default 0     | Cuenta de todos los envíos, AC o no.                             |
| `accepted_submissions`   | INTEGER      | NOT NULL, default 0     | Cuenta de envíos con verdict `AC`.                               |
| `acceptance_rate`        | DECIMAL(5,2) |                         | Calculado como `accepted_submissions / total_submissions * 100`. |
| `contests_participated`  | INTEGER      | NOT NULL, default 0     |                                                                  |
| `best_rank`              | INTEGER      |                         | Mejor posición histórica en un contest.                          |
| `last_active_at`         | TIMESTAMPTZ  |                         | Último envío o login.                                            |
| `updated_at`             | TIMESTAMPTZ  | NOT NULL, default now() |                                                                  |

**Por qué tabla separada**: aísla escrituras frecuentes (cada submission evaluada toca stats) de la tabla `users` (perfil, casi inmutable). Reduce contención y permite particionar si crece.

### Eventos consumidos (entradas)

| Evento                 | Origen                                       | Acción                                                                                                                                                                                                  |
| ---------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user.created`         | Authentik (vía webhook → SQS) o primer login | Inserta fila en `users` con datos del JWT.                                                                                                                                                              |
| `submission.evaluated` | submissions-service                          | Incrementa `total_submissions`. Si el verdict es `AC` y es el **primer** AC del user para ese problem, incrementa `accepted_submissions` y `problems_solved_<difficulty>`. Recalcula `acceptance_rate`. |
| `contest.finished`     | contests-service                             | Para cada user que participó: incrementa `contests_participated`, actualiza `best_rank` y `rating`.                                                                                                     |

### API expuesta (interna gRPC + REST)

- `GET /v1/users/me` (REST público autenticado) — perfil del usuario del token.
- `GET /v1/users/{userId}` (REST público) — perfil público (sin email).
- `GET /v1/users/{userId}/stats` (REST público) — stats.
- `rpc GetUserBasic(userId) returns (UserBasic)` (gRPC interno) — `{ userId, username, displayName, avatarUrl }` para que otros servicios resuelvan IDs a nombres (ej. contests-service para renderizar el leaderboard).

---

## contests-service

**Tipo de DB**: **PostgreSQL** (metadata persistente) + **Redis** (leaderboard en tiempo real).

**Por qué dual-store**:

- Postgres maneja contests, enrollments y resultados finales — datos transaccionales, queryables por status/fecha/usuario.
- Redis maneja el leaderboard en vivo — Sorted Set con operaciones `ZADD`/`ZRANGE` que dan latencia sub-milisegundo aun con 50.000 participantes simultáneos. Persistir esto en Postgres no escala al volumen de actualizaciones que un contest pico tiene (500.000 envíos en 90 minutos).

El leaderboard live en Redis es la **fuente de verdad durante el contest**. Cuando el contest termina, se persiste un snapshot a `contest_results` en Postgres como histórico inmutable.

### Esquema PostgreSQL

#### `contests`

| Columna                 | Tipo                | Restricciones                | Descripción                                                                         |
| ----------------------- | ------------------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| `id`                    | UUID                | PK, NOT NULL                 |                                                                                     |
| `slug`                  | VARCHAR(128)        | UNIQUE, NOT NULL             | URL-friendly.                                                                       |
| `title`                 | VARCHAR(255)        | NOT NULL                     |                                                                                     |
| `description`           | TEXT                |                              | Markdown.                                                                           |
| `starts_at`             | TIMESTAMPTZ         | NOT NULL                     |                                                                                     |
| `ends_at`               | TIMESTAMPTZ         | NOT NULL                     |                                                                                     |
| `status`                | contest_status_enum | NOT NULL, default 'UPCOMING' | `UPCOMING` / `LIVE` / `FINISHED` / `CANCELLED`.                                     |
| `penalty_per_wrong_min` | INTEGER             | NOT NULL, default 20         | Penalización en minutos por envío incorrecto en problema finalmente resuelto (RF4). |
| `max_participants`      | INTEGER             |                              | NULL = ilimitado.                                                                   |
| `created_by`            | UUID                | NOT NULL                     | `user_id` del SETTER/ADMIN que lo creó.                                             |
| `created_at`            | TIMESTAMPTZ         | NOT NULL, default now()      |                                                                                     |
| `updated_at`            | TIMESTAMPTZ         | NOT NULL, default now()      |                                                                                     |

**Índices**:

- `idx_contests_status_starts` (`status`, `starts_at`) — listar upcoming/live ordenados.
- `idx_contests_ends_at` (`ends_at`) WHERE `status = 'LIVE'` — para el cron que cierra contests.

**Constraints**: `ends_at > starts_at`.

> El campo `status` lo mantiene un cron interno del contests-service: cada minuto chequea si algún contest debe pasar de `UPCOMING` → `LIVE` o de `LIVE` → `FINISHED`. La transición a `FINISHED` dispara la persistencia del leaderboard.

#### `contest_problems`

Relación M:N entre `contests` y los problemas (que viven en problems-service).

| Columna       | Tipo        | Restricciones                | Descripción                                                                                                                                |
| ------------- | ----------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`          | UUID        | PK, NOT NULL                 |                                                                                                                                            |
| `contest_id`  | UUID        | FK → `contests.id`, NOT NULL |                                                                                                                                            |
| `problem_id`  | UUID        | NOT NULL                     | Referencia lógica al problems-service. **No es FK real** (DB diferente). La validación de existencia se hace al crear el contest vía gRPC. |
| `order_index` | INTEGER     | NOT NULL                     | Posición del problema en el contest (1, 2, 3…).                                                                                            |
| `score`       | INTEGER     | NOT NULL, default 100        | Puntaje del problema (si se usa scoring por puntos en vez de cantidad).                                                                    |
| `created_at`  | TIMESTAMPTZ | NOT NULL, default now()      |                                                                                                                                            |

**Índices**:

- UNIQUE (`contest_id`, `problem_id`)
- UNIQUE (`contest_id`, `order_index`)

#### `contest_enrollments`

| Columna       | Tipo        | Restricciones                | Descripción                         |
| ------------- | ----------- | ---------------------------- | ----------------------------------- |
| `id`          | UUID        | PK, NOT NULL                 |                                     |
| `contest_id`  | UUID        | FK → `contests.id`, NOT NULL |                                     |
| `user_id`     | UUID        | NOT NULL                     | Referencia lógica al users-service. |
| `enrolled_at` | TIMESTAMPTZ | NOT NULL, default now()      |                                     |

**Índices**:

- UNIQUE (`contest_id`, `user_id`) — un usuario solo se inscribe una vez.
- `idx_enrollments_user` (`user_id`) — listar contests de un usuario.
- `idx_enrollments_contest` (`contest_id`) — contar participantes y validar ingreso.

#### `contest_results`

Snapshot inmutable del leaderboard final, persistido cuando `status` pasa a `FINISHED`.

| Columna                 | Tipo        | Restricciones                | Descripción                         |
| ----------------------- | ----------- | ---------------------------- | ----------------------------------- |
| `id`                    | UUID        | PK, NOT NULL                 |                                     |
| `contest_id`            | UUID        | FK → `contests.id`, NOT NULL |                                     |
| `user_id`               | UUID        | NOT NULL                     |                                     |
| `final_rank`            | INTEGER     | NOT NULL                     | Posición final, 1 = ganador.        |
| `problems_solved`       | INTEGER     | NOT NULL                     |                                     |
| `total_penalty_minutes` | INTEGER     | NOT NULL                     | Penalización acumulada.             |
| `last_submission_at`    | TIMESTAMPTZ |                              | Timestamp del último envío exitoso. |
| `created_at`            | TIMESTAMPTZ | NOT NULL, default now()      |                                     |

**Índices**:

- UNIQUE (`contest_id`, `user_id`)
- `idx_results_contest_rank` (`contest_id`, `final_rank`) — listar top N de un contest.
- `idx_results_user` (`user_id`) — historial de contests de un user.

### Esquema Redis (leaderboard en vivo)

**No persistente**: si Redis cae durante un contest, se rehidrata desde Postgres (lentamente) o se acepta un gap (mejor: cron de checkpoint cada 60s a Postgres como tabla `contest_leaderboard_snapshot` opcional).

#### Estructuras

**Sorted Set** — ranking primario:

```
KEY:    leaderboard:contest:{contestId}
TYPE:   ZSET
MEMBER: userId
SCORE:  problems_solved * 10^9 - total_penalty_seconds
```

El truco del score combinado: `problems_solved` ocupa los bits altos (más problemas = mejor) y la penalización los bits bajos invertida (menos penalización = mejor). `ZRANGE … REV` da el ranking directo.

**Hash por usuario** — detalle de cada problema del contest:

```
KEY:    leaderboard:contest:{contestId}:user:{userId}
TYPE:   HASH
FIELD:  problem:{problemId}
VALUE:  JSON { "solved": true, "wrongAttempts": 2, "solvedAtSec": 4321 }
```

**Pub/Sub** — opcional, si en el futuro queremos WebSockets:

```
CHANNEL: leaderboard:contest:{contestId}:updates
```

#### Operaciones clave

| Acción                                         | Comando Redis                                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Envío AC de un user resuelve un problema nuevo | `HSET leaderboard:contest:{c}:user:{u} problem:{p} '{...}'` + `ZADD leaderboard:contest:{c} <newScore> {u}` |
| Envío WA en problema                           | `HINCRBY leaderboard:contest:{c}:user:{u} problem:{p}.wrongAttempts 1`                                      |
| Leaderboard top 100                            | `ZREVRANGE leaderboard:contest:{c} 0 99 WITHSCORES`                                                         |
| Posición de un user                            | `ZREVRANK leaderboard:contest:{c} {u}`                                                                      |
| TTL (auto-limpieza ~1h post-contest)           | `EXPIRE leaderboard:contest:{c} 3600` (después de persistir snapshot)                                       |

### Eventos consumidos

| Evento                                         | Origen              | Acción                                                                                                                                                  |
| ---------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `submission.evaluated` con `contestId != null` | submissions-service | Si verdict = AC y problema aún no resuelto por este user en este contest → actualizar Sorted Set y Hash. Si verdict ≠ AC → incrementar `wrongAttempts`. |

### Eventos emitidos

| Evento                       | Cuándo                                                       | Suscriptores                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `contest.enrollment.created` | Nueva inscripción                                            | users-service (preview de stats)                                                                                                             |
| `contest.started`            | Cron transiciona a `LIVE`                                    | submissions-service (libera envíos al contest), analytics                                                                                    |
| `contest.finished`           | Cron transiciona a `FINISHED` (después de persistir results) | users-service (incrementa `contests_participated`, recalcula rating + best_rank), problems-service (mark problems as “post-contest visible”) |

### API expuesta

REST público:

- `GET /v1/contests`
- `GET /v1/contests/{id}`
- `POST /v1/contests/{id}/enroll` / `DELETE /v1/contests/{id}/enroll`
- `GET /v1/contests/{id}/problems`
- `GET /v1/contests/{id}/leaderboard` — lee de Redis (live) o de `contest_results` (finished).
- `POST /v1/contests` — SETTER/ADMIN.

gRPC interno:

- `rpc IsContestLive(contestId) returns (ContestStatus)` — usado por submissions-service al recibir un envío con `contestId`, para validar que el contest está activo y el user inscripto.
- `rpc GetContestProblems(contestId, requesterId) returns (ProblemList)` — listar problemas del contest (sólo si el contest está LIVE y el requester está inscripto, o si es ADMIN).

---

## Patrones aplicados

### Database per Service

Cada uno de los cuatro servicios tiene su propia instancia/schema de PostgreSQL. **Ningún servicio lee la DB de otro**. Si problems-service necesita el username de un user, lo obtiene vía gRPC de users-service. Si contests-service necesita validar la existencia de un problemId, lo obtiene vía gRPC de problems-service.

Esto cuesta latencia adicional pero permite:

- Cambios de schema sin coordinar deploys.
- Escalado de DB por servicio según patrón de carga.
- Aislamiento de fallos: una corrupción/lock en submissions no degrada el catálogo.

### Saga Pattern (choreography)

Para operaciones que tocan múltiples servicios usamos eventos vía **SNS + SQS** (no un orquestador central). Cada servicio decide reaccionar a los eventos relevantes.

**Saga: "Envío evaluado durante contest"**

1. submissions-service evalúa el envío y persiste el resultado.
2. submissions-service publica `submission.evaluated` con `contestId`.
3. **En paralelo** suscriben:
   - contests-service → actualiza Redis Sorted Set.
   - problems-service → recalcula `acceptance_rate` del problema.
   - users-service → actualiza `user_stats` del autor.
4. No hay rollback distribuido. Si uno falla, se reintenta (vía SQS retry); si agota intentos, va a DLQ y se monitorea.

**Saga: "Contest finaliza"**

1. Cron interno de contests-service detecta `ends_at < now()` y `status = LIVE`.
2. contests-service:
   a. Lee Sorted Set + Hash de Redis.
   b. Persiste snapshot a `contest_results` en una transacción local.
   c. Actualiza `contests.status = FINISHED`.
   d. Publica `contest.finished` con los rankings.
   e. Programa expiración de las keys de Redis (1 h).
3. users-service consume `contest.finished` y actualiza `contests_participated`, `rating`, `best_rank` para cada participante.

### Dead Letter Queue (DLQ)

Cada cola SQS tiene una DLQ asociada con política `maxReceiveCount = 5`:

| Cola principal                | DLQ                               | Cuándo va a DLQ                                                                                   |
| ----------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `submission-jobs`             | `submission-jobs-dlq`             | El judge worker no pudo procesar el envío (timeout, sandbox roto, mensaje malformado).            |
| `submission-evaluated-events` | `submission-evaluated-events-dlq` | El consumidor (contests/problems/users-service) falló 5 veces consecutivas al procesar el evento. |
| `contest-lifecycle-events`    | `contest-lifecycle-events-dlq`    | Falla la actualización de stats por `contest.finished`.                                           |

Cada DLQ tiene una alarma de CloudWatch que dispara cuando llega un mensaje. La inspección manual (o un Lambda de reprocesamiento idempotente) decide si reintroducir.

### Resiliencia en llamadas síncronas (gRPC)

Cuando un servicio llama a otro vía gRPC (ej. submissions-service → contests-service para `IsContestLive`):

- **Circuit Breaker**: el cliente gRPC abre el circuito si la tasa de errores > 50% en una ventana de 30s. Mientras está abierto, falla rápido con `503` sin tocar la red. Reintenta cerrar después de 30s con un single probe.
- **Bulkhead**: pool de conexiones segregado por servicio destino. submissions-service tiene un pool de 50 conexiones a contests-service y otro pool de 50 a problems-service, así una sobrecarga en uno no consume todos los slots.
- **Retry con backoff exponencial**: 3 intentos con jitter (100ms, 400ms, 1600ms ± 30%). Solo para errores transitorios (`UNAVAILABLE`, `DEADLINE_EXCEEDED`); nunca para `INVALID_ARGUMENT` o `NOT_FOUND`.

### Idempotencia

Los handlers de eventos SQS son **idempotentes**:

- `submission.evaluated` incluye `submissionId`. El consumidor (users-service) verifica si ya procesó ese `submissionId` (via tabla `processed_events`) antes de aplicar el cambio.
- Esto cubre el caso de redelivery por timeout o por reintento de la DLQ.

---

## Decisiones abiertas

| Tema                                              | Decisión pendiente                                                                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rating system                                     | Se asume ELO simple. Hay que decidir el factor K (volatilidad) y el rating inicial (1500).                                                             |
| Capacidad por contest                             | `max_participants` está en el schema pero no decidimos el límite default. Se sugiere `NULL` (ilimitado) para esta fase.                                |
| Snapshot de checkpoint del leaderboard a Postgres | Cada 60s mientras el contest está LIVE, opcional. Útil para recuperación si Redis cae. No crítico para la fase 1.                                      |
| Sincronización inicial de users desde Authentik   | ¿Webhook desde Authentik a un endpoint del users-service, o lazy-creation en el primer login? Tarea para coordinar con quien implemente users-service. |
