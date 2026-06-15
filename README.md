# Leetcode

Plataforma tipo LeetCode construida como sistema de microservicios. Resuelve **AuthN con OIDC + PKCE**, **AuthZ con RBAC** (`USER`, `SETTER`, `ADMIN`), gestión de problemas, envíos de código con judge asíncrono y concursos. Deployable en AWS con CDK.

> Proyecto de la materia **Arquitectura y Microservicios** (Maestría FullStack, UCB).

## Repos relacionados

| Repo                                                         | Contiene                                          |
| ------------------------------------------------------------ | ------------------------------------------------- |
| **Leetcode** (este)                                          | Frontend SPA, 5 microservicios, contratos Smithy. |
| [**AWS_Leetcode**](https://github.com/Renevc14/AWS_Leetcode) | Infraestructura AWS con CDK (13 stacks).          |

## Arquitectura

```
                        ┌─────────────────┐
   browser ─── HTTPS ───┤   CloudFront    │
                        │  (SPA + /v1/*)  │
                        └────────┬────────┘
            ┌────────────────────┤
            │                    │
        ┌───▼──────┐    ┌────────▼─────────┐
        │  S3 SPA  │    │  ALB path-based  │
        │  bucket  │    │  /v1/problems*   │
        └──────────┘    │  /v1/users*      │
                        │  /v1/submissions*│
                        │  /v1/contests*   │
                        └────────┬─────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
         ┌──────▼─────┐   ┌──────▼─────┐   ┌──────▼─────┐
         │ Fargate    │   │ Fargate    │   │ Fargate    │  ... (5 servicios)
         │ Smithy SDK │   │ Smithy SDK │   │ Smithy SDK │
         └──────┬─────┘   └──────┬─────┘   └──────┬─────┘
                │                │                │
                └────────┬───────┴────────┬───────┘
                  ┌──────▼──────┐  ┌──────▼──────┐
                  │ RDS Postgres│  │ ElastiCache │
                  │ (4 DBs por  │  │ Redis       │
                  │  servicio)  │  │ (BullMQ +   │
                  └─────────────┘  │  cache)     │
                                   └──────┬──────┘
                                          │
                                   ┌──────▼──────────┐
                                   │ executor EC2    │
                                   │ Docker-in-Docker│
                                   │ (sandbox runs)  │
                                   └─────────────────┘

         Authentik (OIDC IdP) en EC2 ── PKCE flow ── browser
```

- **Frontend SPA** servida por CloudFront desde S3. Routing de SPA lo hace una CloudFront Function que reescribe paths del cliente a `/index.html`.
- **API** entra por CloudFront `/v1/*` → ALB con listener rules por servicio → 4 Fargate tasks (problems, users, submissions, contests).
- **Judge asíncrono**: `submissions-service` encola jobs en BullMQ (Redis), un worker embebido los toma y llama al `executor-service` que corre el código en sandboxes Docker.
- **OIDC**: Authentik self-hosted emite JWTs (RS256). El frontend hace Authorization Code + PKCE; los tokens viven en memoria.
- **AuthZ**: cada servicio verifica firma con JWKS, valida `scope`/`role` claims y aplica reglas de negocio (un user solo ve sus submissions; solo SETTER/ADMIN crea problemas; etc.).

## Estructura

- `frontend/` — SPA React 19 + Vite + TypeScript con `react-oidc-context`. Tokens en memoria, PKCE en sessionStorage.
- `microservices/` — 5 servicios con contratos Smithy + SSDK TypeScript:
  - `problems-service` — catálogo de problemas, test cases públicos/ocultos
  - `submissions-service` — envíos, historial, judge BullMQ embebido
  - `users-service` — perfiles, upsert desde JWT del IdP, stats
  - `contests-service` — concursos, leaderboard
  - `executor-service` — sandbox runner con Dockerode, lenguajes Python/Node/Java/C++
- `smithy/` — Modelos Smithy (IDL) de los servicios + `smithy-build.json` con codegen.
- `packages/` — SDKs TypeScript generados (server + client) y OpenAPI por servicio. **Git-ignored**, se regeneran con `pnpm smithy:build:sdk`.
- `databases/` — Scripts SQL de inicialización para cada servicio.
- `compose.yaml` — `docker compose` para levantar Postgres + Redis localmente.

(La infra AWS está en [AWS_Leetcode](https://github.com/Renevc14/AWS_Leetcode).)

## Stack

| Capa           | Tecnología                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Frontend       | React 19, Vite 7, TypeScript 5, `react-oidc-context`, `jose`, `@tanstack/react-query`, Tailwind, Monaco editor  |
| Contratos      | Smithy 2 (IDL) → codegen TypeScript SDK (server + client) + OpenAPI                                             |
| Microservicios | Node 22, TypeScript, Smithy server handler nativo `http`                                                        |
| Persistencia   | PostgreSQL 17 (una DB por servicio), Prisma 7 ORM con adapter `@prisma/adapter-pg`                              |
| Cola + cache   | Redis 7, BullMQ                                                                                                 |
| Sandbox runner | Dockerode + imágenes runner por lenguaje                                                                        |
| Identidad      | Authentik OIDC self-hosted                                                                                      |
| Infra          | AWS CDK (TypeScript), ECS Fargate, ALB, RDS Postgres, ElastiCache, CloudFront + S3, Route 53/EC2 para Authentik |

## Run vs Submit

|              | Run ▶                                                   | Submit ✅                                                                                 |
| ------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Test cases   | solo los **públicos** (ejemplos)                        | **todos** (públicos + ocultos)                                                            |
| Persistencia | no se guarda                                            | queda en la tabla `submissions`                                                           |
| Flujo        | síncrono — POST `/v1/submissions/run` → executor → JSON | asíncrono — POST `/v1/submissions` → BullMQ → worker → polling GET `/v1/submissions/{id}` |
| Verdict      | AC / WA contra ejemplos                                 | AC / WA / TLE / MLE / RE / CE oficial                                                     |
| Stats        | no afecta                                               | cuenta en tasa de aceptación                                                              |

## Quick start local

### Requisitos

- Docker
- Node.js >= 22
- pnpm (`corepack enable && corepack prepare pnpm@11.3.0 --activate`)
- Smithy CLI
- Java 17+ (para correr Smithy codegen)

### Comandos

```bash
git clone https://github.com/Renevc14/Leetcode.git
cd Leetcode

# Generar SDKs Smithy (server + client + OpenAPI)
cd smithy && smithy build && cd ..

# Levantar Postgres + Redis localmente
cp .env.example .env
docker compose up -d

# Instalar deps del workspace
pnpm install

# Compilar SDKs TS
pnpm smithy:build:sdk

# Frontend
cp frontend/.env.example frontend/.env  # editar con valores de tu Authentik
pnpm --filter @leetcode/frontend dev    # http://localhost:5173

# Microservicios (en terminales separadas)
pnpm --filter @leetcode/problems-service dev
pnpm --filter @leetcode/users-service dev
pnpm --filter @leetcode/submissions-service dev
pnpm --filter @leetcode/contests-service dev
pnpm --filter @leetcode/executor-service dev
```

### Puertos locales

| Servicio            | Postgres | DB / user / password                      |
| ------------------- | -------- | ----------------------------------------- |
| problems-service    | 5433     | `problems / problems / problems`          |
| submissions-service | 5434     | `submissions / submissions / submissions` |
| users-service       | 5435     | `users / users / users`                   |
| contests-service    | 5436     | `contests / contests / contests`          |
| Redis               | 6379     | sin auth                                  |

Microservicios escuchan en 3001-3005, frontend en 5173.

### Variables de entorno frontend (`frontend/.env`)

```
VITE_OIDC_AUTHORITY=http://localhost:9000/application/o/leetcode
VITE_OIDC_CLIENT_ID=leetcode
VITE_API_BASE_URL=http://localhost:3001    # o el ALB si apuntas a prod
```

En production builds el `AUTHORITY` se setea con `VITE_OIDC_AUTHORITY` apuntando al CloudFront proxy de Authentik para evitar mixed content.

## Validación

```bash
pnpm --filter @leetcode/frontend lint
pnpm --filter @leetcode/frontend build

# Type-check todos los microservicios
pnpm -r --filter "@leetcode/*-service" typecheck
```

## Usuarios de prueba

El blueprint de Authentik (en `AWS_Leetcode`) crea estos usuarios al primer deploy:

| Usuario       | Password   | Roles               |
| ------------- | ---------- | ------------------- |
| `test-user`   | `Test123!` | USER                |
| `test-setter` | `Test123!` | USER, SETTER        |
| `test-admin`  | `Test123!` | USER, SETTER, ADMIN |

Solo para demo. En producción reemplazar.

## Deploy a AWS

El monorepo se despliega con:

1. **Generar SDKs Smithy + compilar TS** (`pnpm smithy:build:sdk && pnpm build`) — los `packages/*/dist-{cjs,es,types}` viajan en el contexto del build de Docker.
2. **Build de las 5 imágenes Docker** — `Dockerfile.service` multi-stage parametrizado por `--build-arg SERVICE=<name>` para los 4 servicios "estándar"; `executor-service` tiene su propio Dockerfile (necesita Docker socket).
3. **Push a ECR** — repos `leetcode/<service>`.
4. **`cdk deploy --all`** en `AWS_Leetcode` — provisiona VPC, RDS, ElastiCache, ECS, ALB, CloudFront, S3, Authentik EC2, API Gateway.
5. **Sync del bundle del frontend** a S3 e invalidar CloudFront.

Detalles de stacks, parámetros y workflow en el README de `AWS_Leetcode`.

## Decisiones de diseño

- **Database per Service**: cada servicio tiene su propio schema Postgres. Acoplamiento bajo, escalable independientemente. Joins entre servicios se hacen vía API o eventos, nunca SQL cross-DB.
- **Smithy como contrato fuente**: un único IDL genera SDK server (handler), SDK client tipado y OpenAPI para docs. Si la API cambia, el codegen rompe la compilación de quien la consume.
- **Tokens en memoria**: el access token vive en una `InMemoryWebStorage` del frontend (no localStorage), el state CSRF + PKCE verifier en `sessionStorage` (efímero). Mitiga XSS-token-exfiltration.
- **JWKS verify**: cada servicio valida la firma del JWT contra el endpoint JWKS de Authentik (cacheado vía `jose.createRemoteJWKSet`). Sin verificación, el JWT es texto plano que cualquiera podría falsificar.
- **Judge embebido en submissions-service**: el worker BullMQ corre en el mismo proceso del API server. Evita una Fargate task adicional; escala vertical antes que horizontal hasta que sea necesario separar.
- **Executor en EC2 con Docker socket**: el sandboxing por contenedor requiere acceso al daemon Docker. Fargate no expone socket, por eso el executor vive en una EC2 dedicada con Cloud Map registration para que el resto del cluster lo resuelva por DNS.

## Endpoints principales

| Servicio    | Método | Path                   | Auth               | Notas                         |
| ----------- | ------ | ---------------------- | ------------------ | ----------------------------- |
| problems    | GET    | `/v1/problems`         | Bearer             | listado paginado              |
| problems    | GET    | `/v1/problems/{id}`    | Bearer             | detalle + test cases públicos |
| problems    | POST   | `/v1/problems`         | SETTER/ADMIN       | crear                         |
| users       | GET    | `/v1/users/me`         | Bearer             | upsert desde JWT              |
| submissions | POST   | `/v1/submissions/run`  | Bearer             | sync, test cases públicos     |
| submissions | POST   | `/v1/submissions`      | Bearer             | async, encola en BullMQ       |
| submissions | GET    | `/v1/submissions/{id}` | Bearer             | polling para verdict          |
| submissions | GET    | `/v1/submissions`      | Bearer             | historial (filtros)           |
| contests    | GET    | `/v1/contests`         | Bearer             | listado                       |
| contests    | POST   | `/v1/contests`         | SETTER/ADMIN       | crear                         |
| executor    | POST   | `/internal/run`        | service-to-service | corre código en sandbox       |

OpenAPI completo: `packages/<service>-openapi/<service>.openapi.json`.

## Limpiar el repo

```bash
# Limpia node_modules, dist y packages generados
pnpm -r exec rm -rf node_modules dist
rm -rf packages

# Reset DBs locales
docker compose down -v
```
