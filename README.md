# Leetcode

Sistema de autenticación y autorización para una plataforma tipo LeetCode. Usa OIDC con Authorization Code + PKCE para AuthN y RBAC con tres roles (USER, SETTER, ADMIN) para AuthZ.

## Estructura del monorepo

- `infra/` — Infraestructura como código con AWS CDK en TypeScript.
- `frontend/` — SPA en React 18 + Vite (pendiente).
- `scripts/` — Utilidades operativas (pendiente).
- `docs/` — Documentación técnica (pendiente).

## Stack

- **AWS:** CDK, ECS Fargate, RDS PostgreSQL, API Gateway HTTP API con JWT Authorizer, Secrets Manager.
- **Frontend:** React 18 + TypeScript + Vite, `react-oidc-context`.
- **Identity Provider:** Authentik (self-hosted en ECS Fargate).
- **Tests E2E:** Playwright.

## Prerequisitos

- Node.js 20+ y npm 10+.
- AWS CLI configurada (`aws sts get-caller-identity` debe responder).
- AWS CDK CLI: `npm install -g aws-cdk`.

## Setup local

```bash
# Dependencias de la raíz (husky, lint-staged, prettier)
npm install

# Dependencias de infraestructura
npm --prefix infra install
```

El pre-commit hook de husky ejecuta `lint-staged` automáticamente y formatea con Prettier los archivos modificados.

## Comandos de infraestructura

Desde `infra/`:

| Comando                | Uso                                  |
| ---------------------- | ------------------------------------ |
| `npm run build`        | Compila TypeScript a JavaScript      |
| `npm run lint`         | Ejecuta ESLint sobre todo el código  |
| `npm run format`       | Aplica Prettier a todos los archivos |
| `npm test`             | Tests de assertions de los stacks    |
| `npx cdk synth`        | Sintetiza CloudFormation             |
| `npx cdk diff`         | Compara con el stack desplegado      |
| `npx cdk deploy --all` | Despliega todos los stacks           |

## Primer despliegue

1. Define la región AWS (sugerida `us-east-1`).
2. Bootstrap del entorno (una sola vez por cuenta/región):

   ```bash
   npm --prefix infra exec cdk bootstrap
   ```

3. Verifica que sintetiza:

   ```bash
   npm --prefix infra exec cdk synth --all
   ```

4. Despliega:

   ```bash
   npm --prefix infra exec cdk deploy --all
   ```

## Stacks actuales

- **NetworkStack** — VPC con subnets public/app/data en 2 AZ y 1 NAT Gateway.
- **SecretsStack** — `AUTHENTIK_SECRET_KEY` y client secret OIDC en Secrets Manager.
- **DatabaseStack** — RDS PostgreSQL para Authentik con credenciales auto-rotadas cada 30 días.

## Costos aproximados (dev)

- NAT Gateway: ~$32/mes.
- RDS t4g.micro: ~$13/mes.
- ECS Fargate (al añadir Authentik): ~$15/mes idle.

Ejecutar `cdk destroy --all` al terminar la sesión para evitar costos innecesarios.
