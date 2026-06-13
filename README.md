# Leetcode

Sistema de autenticación y autorización para una plataforma tipo LeetCode. Usa OIDC con Authorization Code + PKCE para AuthN y RBAC con tres roles (`USER`, `SETTER`, `ADMIN`) para AuthZ. Backend de microservicios sobre AWS.

> Proyecto de la materia **Arquitectura y Microservicios** (Maestría FullStack, UCB).

## Repos relacionados

| Repo                                                         | Contiene                                |
| ------------------------------------------------------------ | --------------------------------------- |
| **Leetcode** (este)                                          | Frontend SPA, microservicios y DBs.     |
| [**AWS_Leetcode**](https://github.com/Renevc14/AWS_Leetcode) | Infraestructura AWS con CDK (4 stacks). |

## Estructura

- `frontend/` — SPA en React 19 + Vite + TypeScript con OIDC + PKCE y RBAC.
- `microservices/` — Cuatro servicios con contratos Smithy + SSDK TypeScript:
  - `problems-service` (catálogo de problemas)
  - `submissions-service` (envíos e historial)
  - `users-service` (perfiles y stats)
  - `contests-service` (concursos y leaderboard)
- `smithy/` — Modelos Smithy (IDL) de los 4 servicios y configuración de codegen (`smithy-build.json`).
- `packages/` — SDKs TypeScript generados por Smithy (server + client) y contratos de OpenAPI para cada servicio.
- `databases/` — Scripts SQL de inicialización para cada servicio (una DB por servicio).
- `compose.yaml` — `docker compose` para levantar los 4 Postgres + Redis en local.

(La infra de AWS vive en [AWS_Leetcode](https://github.com/Renevc14/AWS_Leetcode).)

## Stack

- **Frontend**: React 19 + TypeScript + Vite, `react-oidc-context`.
- **Backend**: 4 microservicios Smithy + TypeScript SSDK, REST sobre HTTPS.
- **Persistencia**: una PostgreSQL 17 por servicio (patrón Database per Service). Redis compartido para leaderboards y caches.
- **Mensajería**: SNS + SQS para eventos asíncronos (Saga choreography), DLQ por cada cola.
- **Identity Provider**: Authentik self-hosted (`ghcr.io/goauthentik/server:2024.10`).
- **Infra AWS**: CDK, EC2, API Gateway HTTP API con Lambda Authorizer, Secrets Manager.

## Quick start local

### Requisitos previos

Para este proyecto se necesita contar con las siguientes herramientas:

- Docker
- Node.js (>= v22)
- pnpm (`corepack enable && corepack prepare pnpm@11.3.0 --activate`)
- Smithy CLI

### Comandos

```bash
git clone https://github.com/Renevc14/Leetcode.git
cd Leetcode

# Generar los SDKs y contratos OpenAPI con Smithy CLI por primera vez
cd smithy
smithy build
cd ../

# Levantar las bases de datos locales
cp .env.example .env
docker compose up -d

# Instalar todas las dependencias del workspace
pnpm install

# Constuir los SDKs generados
pnpm smithy:build:sdk

# Frontend
cp frontend/.env.example frontend/.env
# Editar frontend/.env con los outputs del deploy de AWS_Leetcode
pnpm --filter @leetcode/frontend dev   # http://localhost:5173
```

### Puertos locales de las DBs

| Servicio    | Postgres puerto | DB / user / password (defaults)           |
| ----------- | --------------- | ----------------------------------------- |
| problems    | `5433`          | `problems / problems / problems`          |
| submissions | `5434`          | `submissions / submissions / submissions` |
| users       | `5435`          | `users / users / users`                   |
| contests    | `5436`          | `contests / contests / contests`          |
| Redis       | `6379`          | sin auth                                  |

## Variables de entorno del frontend

`frontend/.env.example` lista las variables esperadas. Después del deploy de AWS_Leetcode:

```
VITE_AUTH_AUTHORITY=http://<EIP>:9000/application/o/leetcode/
VITE_AUTH_CLIENT_ID=leetcode
VITE_AUTH_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_API_BASE_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com
```

`<EIP>` viene del output `AuthentikStack.PublicIp`; `<api-id>` del output `ApiGatewayStack.ApiUrl`.

## Validación local

```bash
pnpm --filter @leetcode/frontend lint
pnpm --filter @leetcode/frontend build
```

## Usuarios de prueba

El blueprint de Authentik (en AWS_Leetcode) crea estos usuarios automáticamente al primer deploy:

| Usuario       | Password   | Grupos                    |
| ------------- | ---------- | ------------------------- |
| `test-user`   | `Test123!` | `USER`                    |
| `test-setter` | `Test123!` | `USER`, `SETTER`          |
| `test-admin`  | `Test123!` | `USER`, `SETTER`, `ADMIN` |

Demo-only. En producción reemplazar.
