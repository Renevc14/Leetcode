# Arquitectura

## Vista de alto nivel

```
                      ┌────────────────────────┐
                      │   Usuario (browser)    │
                      └───────────┬────────────┘
                                  │
                                  │ 1. GET /
                                  ▼
        ┌─────────────────────────────────────────────────┐
        │  Frontend SPA  —  React 19 + Vite               │
        │  · react-oidc-context (PKCE)                    │
        │  · guards RBAC (RequireAuth, RequireRole)       │
        │  · axios con interceptor Authorization          │
        │  · tokens en memoria (InMemoryWebStorage)       │
        │  Dev: http://localhost:5173                     │
        └────────────────┬─────────────────┬──────────────┘
                         │                 │
                  2. Auth Code             │ 5. Authorization: Bearer <JWT>
                     Flow + PKCE           │
                         ▼                 ▼
        ┌────────────────────────┐   ┌──────────────────────────┐
        │  Authentik (IdP)       │   │  AWS API Gateway HTTP    │
        │  EC2 t4g.small         │◀──┤  · Lambda Authorizer     │
        │  · server              │ 6 │    valida JWT contra     │
        │  · worker              │ JWKS  JWKS de Authentik      │
        │  · Postgres (docker)   │   │  · GET /v1/me Lambda     │
        │  · Redis (docker)      │   │    devuelve claims       │
        │  · Blueprint auto      │   └──────────────────────────┘
        │  http://<EIP>:9000     │
        └────────────────────────┘
```

## Componentes

### Frontend (`frontend/`)

- **Vite 8 + React 19 + TypeScript**.
- **`react-oidc-context`** maneja el flow Authorization Code + PKCE.
  - `userStore: InMemoryWebStorage` — tokens nunca tocan localStorage/sessionStorage.
  - `automaticSilentRenew: true` — renueva el access token antes de que expire.
- **`useAuth()`** envuelve el hook de la librería y deriva `roles` del claim custom.
- **Guards**: `RequireAuth`, `RequireRole role="…"`, `<Show ifRole="…">`.
- **`api/client.ts`** (axios) con interceptor que adjunta `Authorization: Bearer <access_token>` y maneja `401` global (redirige a login).
- **Validación de env** con Zod (`src/config/env.ts`).
- **Rutas**:
  - `/` y `/problems` — públicas.
  - `/submit` — `RequireRole role="USER"`.
  - `/setter` — `RequireRole role="SETTER"`.
  - `/admin` — `RequireRole role="ADMIN"`.
  - `/auth/callback` — handler del redirect_uri.
  - `/403` — Forbidden.

### Infra (repo separado [AWS_Leetcode](https://github.com/Renevc14/AWS_Leetcode), AWS CDK)

| Stack               | Recursos                                                                                                                                                                                                                                                      | Costo aprox/mes |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **NetworkStack**    | VPC con 1 AZ + 1 subnet pública. Sin NAT Gateway.                                                                                                                                                                                                             | $0              |
| **SecretsStack**    | `authentik/secret-key`, `authentik/leetcode-oidc-client-secret` en Secrets Manager.                                                                                                                                                                           | ~$0.80          |
| **AuthentikStack**  | EC2 `t4g.small` (Amazon Linux 2023 ARM), EBS 20 GB encriptado, Elastic IP, IAM role con `AmazonSSMManagedInstanceCore` + read del secret. UserData baja `docker-compose.yml` y `leetcode.yaml` (blueprint) como CDK Assets, instala docker, levanta el stack. | ~$16.6          |
| **ApiGatewayStack** | HTTP API V2, Lambda Authorizer (Node 20, valida JWT contra JWKS de Authentik manualmente — sin libs externas), Lambda `/v1/me` que devuelve claims. CORS preflight permite `http://localhost:5173`.                                                           | ~$0 (free tier) |

### Identity Provider (Authentik en docker-compose)

Vive **dentro** del EC2, gestionado por `docker-compose`:

- `postgresql:16-alpine` — backend persistente (volumen named `database`).
- `redis:alpine` — cache/sessions (volumen named `redis`).
- `ghcr.io/goauthentik/server:2024.10` ejecutando `server` (UI + API en :9000).
- `ghcr.io/goauthentik/server:2024.10` ejecutando `worker` (jobs background; aplica blueprints).

El worker monta `./blueprints` → `/blueprints/custom:ro` y Authentik escanea ese path recursivamente al arrancar.

## Flow OIDC (Authorization Code + PKCE)

```
Browser            Frontend SPA         Authentik              API Gateway
   │                    │                  │                      │
   │ click "Login"      │                  │                      │
   ├───────────────────▶│                  │                      │
   │                    │ genera           │                      │
   │                    │ code_verifier    │                      │
   │                    │ + code_challenge │                      │
   │                    │ (S256)           │                      │
   │ 302 redirect       │                  │                      │
   │◀───────────────────┤                  │                      │
   │                                       │                      │
   │ GET /authorize?response_type=code     │                      │
   │     &client_id=leetcode               │                      │
   │     &scope=openid profile email       │                      │
   │           roles offline_access        │                      │
   │     &code_challenge=...&S256          │                      │
   │     &redirect_uri=http://localhost... │                      │
   ├──────────────────────────────────────▶│                      │
   │                                       │ render login         │
   │ user/pass                             │                      │
   ├──────────────────────────────────────▶│                      │
   │ 302 ?code=...&state=...               │                      │
   │◀──────────────────────────────────────┤                      │
   │                                                              │
   │ GET /auth/callback?code=...           │                      │
   ├───────────────────▶│                  │                      │
   │                    │ POST /token      │                      │
   │                    │  {code,          │                      │
   │                    │   code_verifier} │                      │
   │                    ├─────────────────▶│                      │
   │                    │ {id_token,       │                      │
   │                    │  access_token,   │                      │
   │                    │  refresh_token}  │                      │
   │                    │◀─────────────────┤                      │
   │                    │ tokens en memoria│                      │
   │ render UI auth     │                  │                      │
   │◀───────────────────┤                  │                      │
   │                    │                                         │
   │ click "Enviar"     │                  │                      │
   ├───────────────────▶│                                         │
   │                    │ GET /v1/me                              │
   │                    │ Authorization: Bearer <access_token>    │
   │                    ├────────────────────────────────────────▶│
   │                    │                                         │ Lambda
   │                    │                                         │ Authorizer:
   │                    │                                         │ ¿iss? ¿aud?
   │                    │                                         │ ¿exp? ¿sig?
   │                    │                                         │ (fetch JWKS,
   │                    │                                         │  verifica RS256)
   │                    │                                         │
   │                    │                            { sub, email,
   │                    │                              name, roles }
   │                    │◀────────────────────────────────────────┤
   │ result             │                                         │
   │◀───────────────────┤                                         │
```

## Modelo de autorización (RBAC)

| Operación                       | Anónimo | USER | SETTER | ADMIN |
| ------------------------------- | ------- | ---- | ------ | ----- |
| Ver catálogo (`/problems`)      | ✅      | ✅   | ✅     | ✅    |
| Enviar solución (`/submit`)     | ❌      | ✅   | ✅     | ✅    |
| Gestionar problemas (`/setter`) | ❌      | ❌   | ✅     | ✅    |
| Panel admin (`/admin`)          | ❌      | ❌   | ❌     | ✅    |

Implementación:

- **Grupos en Authentik** (`USER`, `SETTER`, `ADMIN`) creados por el blueprint.
- **Property mapping `Roles Mapping`** (scope `roles`) emite los nombres de los grupos del usuario en el claim `roles`.
- **Frontend** lee `user.profile.roles`, expone `hasRole(role)`. Los guards usan ese check.
- **No hay jerarquía implícita**: un usuario en `ADMIN` no obtiene acceso a `/submit` salvo que también esté en `USER`. Por eso los usuarios de prueba tienen grupos en cascada (`test-admin` ∈ USER, SETTER, ADMIN).
- **API Gateway** verifica firma y claims (`iss`, `aud`, `exp`) pero **no aplica RBAC**. La autorización por rol ocurre en el frontend para las rutas y, cuando agreguemos endpoints sensibles, debe agregarse también en cada Lambda específica (lee `event.requestContext.authorizer.lambda.roles`).

## Seguridad de tokens

- **Algoritmo**: RS256 (firma asimétrica). La clave pública está en el endpoint JWKS de Authentik.
- **Expiración**: defaults de Authentik (access ~5 min, id_token ~1 min según el provider). Refresh tokens habilitados.
- **Almacenamiento**: solo en memoria (`InMemoryWebStorage`). No localStorage, no cookies.
- **Renovación silenciosa**: react-oidc-context corre `signinSilent` ~60s antes de la expiración del access token, vía iframe oculto que reusa la sesión de Authentik.
- **`userId` siempre se deriva del claim `sub`** del JWT validado. El frontend nunca manda `userId` por body/query.

## Costo total esperado

| Recurso                               | Mensual                   |
| ------------------------------------- | ------------------------- |
| EC2 t4g.small                         | ~$15.00                   |
| EBS gp3 20 GB                         | ~$1.60                    |
| Elastic IP (asociada a EC2 corriendo) | $0                        |
| Secrets Manager (2 secrets)           | ~$0.80                    |
| HTTP API + Lambda                     | ~$0 (free tier cubre dev) |
| Transferencia de datos                | ~$0 (tráfico bajo en dev) |
| **Total**                             | **~$17.40**               |

Se evita NAT Gateway (~$32/mes) usando una sola subnet pública. Eso obliga a que la EC2 tenga IP pública, lo cual es aceptable porque el SG solo expone `:9000` y SSM cubre acceso administrativo.

## Decisiones clave

| Decisión                                                                        | Por qué                                                                                                                                                                           |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EC2 monolítica con docker-compose** en vez de ECS Fargate + RDS + ElastiCache | Reduce costo de ~$90/mes a ~$17/mes para una tarea académica. Acepta que es single-AZ y no HA.                                                                                    |
| **Lambda Authorizer custom** en vez del `HttpJwtAuthorizer` nativo              | El nativo exige issuer HTTPS. Nuestro Authentik corre en HTTP. La Lambda hace la verificación contra el JWKS sin requerir HTTPS.                                                  |
| **Blueprint de Authentik** (`leetcode.yaml`)                                    | Hace el setup reproducible: cualquier re-deploy regenera provider, app, grupos, mapper, bindings y usuarios de prueba. Reduce el setup manual a generar el password de `akadmin`. |
| **Tokens en memoria**                                                           | Mitiga riesgo de XSS robando tokens. Trade-off: refresh requiere silent renew.                                                                                                    |
| **Grupos en cascada en usuarios de prueba**                                     | El frontend no aplica jerarquía implícita. Para que `test-admin` pueda hacer todo lo de USER/SETTER, está en los tres grupos.                                                     |
