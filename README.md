# Leetcode

Sistema de autenticación y autorización para una plataforma tipo LeetCode. Usa OIDC con Authorization Code + PKCE para AuthN y RBAC con tres roles (`USER`, `SETTER`, `ADMIN`) para AuthZ. Desplegado en AWS.

> Proyecto de la materia **Arquitectura y Microservicios** (Maestría FullStack, UCB).

## Repos relacionados

| Repo                                                         | Contiene                                     |
| ------------------------------------------------------------ | -------------------------------------------- |
| **Leetcode** (este)                                          | Frontend SPA en React + Vite, documentación. |
| [**AWS_Leetcode**](https://github.com/Renevc14/AWS_Leetcode) | Infraestructura AWS con CDK (4 stacks).      |

Se separan para que la infra pueda evolucionar independientemente, pero los docs de arquitectura y troubleshooting viven acá (centralizados).

## Documentación

- [**docs/architecture.md**](docs/architecture.md) — Componentes, flow OIDC con diagrama de secuencia, modelo RBAC, decisiones de diseño y trade-offs.
- [**docs/data-model.md**](docs/data-model.md) — Modelo de datos por servicio: tipos de DB, esquemas, eventos y patrones (Database per Service, Saga choreography, DLQ).
- [**docs/setup.md**](docs/setup.md) — Paso a paso completo desde cero: prerequisitos, bootstrap, deploy, configuración del frontend, validación E2E.
- [**docs/authentik-config.md**](docs/authentik-config.md) — Configuración manual de Authentik (fallback si el blueprint no aplica).
- [**docs/troubleshooting.md**](docs/troubleshooting.md) — Issues conocidos y cómo resolverlos.

## Estructura

- `frontend/` — SPA en React 19 + Vite + TypeScript con OIDC + PKCE y RBAC.
- `docs/` — Documentación técnica.

(La infra vive en [AWS_Leetcode](https://github.com/Renevc14/AWS_Leetcode).)

## Stack

- **Frontend**: React 19 + TypeScript + Vite, `react-oidc-context`.
- **Identity Provider**: Authentik self-hosted (`ghcr.io/goauthentik/server:2024.10`) en una EC2 con `docker-compose`.
- **AWS**: VPC simple, EC2 `t4g.small`, API Gateway HTTP API con Lambda Authorizer, Secrets Manager.

## Quick start (frontend)

```bash
git clone https://github.com/Renevc14/Leetcode.git
cd Leetcode

npm install
npm --prefix frontend install

cp frontend/.env.example frontend/.env
# Editar frontend/.env con los outputs del deploy de AWS_Leetcode

npm --prefix frontend run dev   # http://localhost:5173
```

Para desplegar la infra, ver [AWS_Leetcode/README.md](https://github.com/Renevc14/AWS_Leetcode/blob/main/README.md) o la guía completa en [docs/setup.md](docs/setup.md).

## Variables de entorno del frontend

`frontend/.env.example` lista todas las variables esperadas. Después del deploy de AWS_Leetcode:

```
VITE_AUTH_AUTHORITY=http://<EIP>:9000/application/o/leetcode/
VITE_AUTH_CLIENT_ID=leetcode
VITE_AUTH_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_API_BASE_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com
```

`<EIP>` viene del output `AuthentikStack.PublicIp`; `<api-id>` del output `ApiGatewayStack.ApiUrl`.

## Validación local

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Usuarios de prueba

El blueprint de Authentik (en AWS_Leetcode) crea estos usuarios automáticamente al primer deploy:

| Usuario       | Password   | Grupos                    |
| ------------- | ---------- | ------------------------- |
| `test-user`   | `Test123!` | `USER`                    |
| `test-setter` | `Test123!` | `USER`, `SETTER`          |
| `test-admin`  | `Test123!` | `USER`, `SETTER`, `ADMIN` |

Demo-only. En producción reemplazar.
