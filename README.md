# Leetcode

Sistema de autenticación y autorización para una plataforma tipo LeetCode. Usa OIDC con Authorization Code + PKCE para AuthN y RBAC con tres roles (`USER`, `SETTER`, `ADMIN`) para AuthZ. Desplegado en AWS.

> Proyecto de la materia **Arquitectura y Microservicios** (Maestría FullStack, UCB).

## Documentación

- [**docs/architecture.md**](docs/architecture.md) — Componentes, flow OIDC con diagrama de secuencia, modelo RBAC, decisiones de diseño y trade-offs.
- [**docs/setup.md**](docs/setup.md) — Paso a paso completo desde cero: prerequisitos, bootstrap, deploy, configuración del frontend, validación E2E.
- [**docs/authentik-config.md**](docs/authentik-config.md) — Configuración manual de Authentik (fallback si el blueprint no aplica). Documenta provider, app, scopes, grupos, mapper, bindings y usuarios paso a paso.
- [**docs/troubleshooting.md**](docs/troubleshooting.md) — Issues conocidos y cómo resolverlos (credenciales AWS en git-bash, 403 en login, JWT Authorizer issuer HTTPS, etc.).

## Estructura del monorepo

- `infra/` — Infraestructura como código con AWS CDK en TypeScript (4 stacks).
- `frontend/` — SPA en React 19 + Vite + TypeScript con OIDC + PKCE y RBAC.
- `docs/` — Documentación técnica.
- `scripts/` — Utilidades operativas (pendiente).

## Stack

- **AWS**: CDK, EC2 (Authentik en docker-compose), API Gateway HTTP API con Lambda Authorizer, Secrets Manager.
- **Frontend**: React 19 + TypeScript + Vite, `react-oidc-context`.
- **Identity Provider**: Authentik self-hosted (`ghcr.io/goauthentik/server:2024.10`) con Postgres y Redis dentro del mismo EC2.

## Quick start

```bash
git clone https://github.com/Renevc14/Leetcode.git
cd Leetcode

npm install
npm --prefix infra install
npm --prefix frontend install

npm --prefix infra exec cdk bootstrap          # una vez por cuenta/región
npm --prefix infra exec cdk deploy --all       # desplegar (~5 min)
# ... configurar frontend/.env con los outputs ...
npm --prefix frontend run dev                   # http://localhost:5173
```

Cuando termines, **bajar la infra** para no acumular costos: `npm --prefix infra exec cdk destroy --all --force`.

Detalle completo en [docs/setup.md](docs/setup.md).

## Stacks desplegados

| Stack               | Qué hace                                                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NetworkStack**    | VPC con 1 AZ y 1 subnet pública. Sin NAT Gateway.                                                                                                                |
| **SecretsStack**    | `AUTHENTIK_SECRET_KEY` y client secret OIDC en Secrets Manager.                                                                                                  |
| **AuthentikStack**  | EC2 `t4g.small` con docker-compose corriendo Authentik server + worker + Postgres + Redis. UserData baja el `docker-compose.yml` y el blueprint como CDK Assets. |
| **ApiGatewayStack** | HTTP API con Lambda Authorizer que valida JWT contra el JWKS de Authentik. Endpoint mock `GET /v1/me`.                                                           |

## Costo aproximado en us-east-1

| Recurso                     | Mensual         |
| --------------------------- | --------------- |
| EC2 t4g.small               | ~$15            |
| EBS gp3 20 GB               | ~$1.6           |
| Secrets Manager (2 secrets) | ~$0.80          |
| HTTP API + Lambda           | ~$0 (free tier) |
| **Total corriendo 24/7**    | **~$17.40**     |

Detalle en [docs/architecture.md](docs/architecture.md#costo-total-esperado).

## Validación local

```bash
npm --prefix infra run lint
npm --prefix infra run format:check
npm --prefix infra test                  # 16/16 tests
npm --prefix infra exec cdk synth --all

npm --prefix frontend run lint
npm --prefix frontend run build
```

## Variables de entorno del frontend

`frontend/.env.example` lista todas las variables esperadas. Para dev:

```
VITE_AUTH_AUTHORITY=http://<EIP>:9000/application/o/leetcode/
VITE_AUTH_CLIENT_ID=leetcode
VITE_AUTH_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_API_BASE_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com
```

`<EIP>` viene del output `AuthentikStack.PublicIp`; `<api-id>` del output `ApiGatewayStack.ApiUrl`.

## Usuarios de prueba

El blueprint de Authentik crea estos usuarios automáticamente al primer deploy:

| Usuario       | Password   | Grupos                    |
| ------------- | ---------- | ------------------------- |
| `test-user`   | `Test123!` | `USER`                    |
| `test-setter` | `Test123!` | `USER`, `SETTER`          |
| `test-admin`  | `Test123!` | `USER`, `SETTER`, `ADMIN` |

Demo-only. En producción reemplazar.
