# Leetcode

Sistema de autenticación y autorización para una plataforma tipo LeetCode. Usa OIDC con Authorization Code + PKCE para AuthN y RBAC con tres roles (USER, SETTER, ADMIN) para AuthZ.

## Estructura del monorepo

- `infra/` — Infraestructura como código con AWS CDK en TypeScript.
- `frontend/` — SPA en React 18 + Vite (pendiente).
- `scripts/` — Utilidades operativas (pendiente).
- `docs/` — Documentación técnica (pendiente).

## Stack

- **AWS:** CDK, EC2 (Authentik), API Gateway HTTP API con JWT Authorizer, Secrets Manager.
- **Frontend:** React 18 + TypeScript + Vite, `react-oidc-context`.
- **Identity Provider:** Authentik (self-hosted en una EC2 con docker-compose; Postgres y Redis viven como contenedores dentro del mismo host).
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

- **NetworkStack** — VPC con una subnet pública en 1 AZ. Sin NAT Gateway (la EC2 sale a Internet directo).
- **SecretsStack** — `AUTHENTIK_SECRET_KEY` y client secret OIDC en Secrets Manager.
- **AuthentikStack** — EC2 `t4g.small` con Elastic IP y volumen EBS encriptado. Un UserData instala Docker, baja el `docker-compose.yml` desde S3 (asset CDK) y levanta Authentik server + worker + Postgres + Redis.

## Costos aproximados (dev)

- EC2 t4g.small: ~$15/mes.
- EBS gp3 20 GB: ~$1.6/mes.
- Elastic IP (mientras esté asociada): $0.
- Secrets Manager (2 secretos): ~$0.80/mes.

Total: ~$17–20/mes. Ejecutar `cdk destroy --all` al terminar la sesión para no acumular costos.

## Acceder a Authentik

Después del primer `cdk deploy`, el output `AuthentikStack.AuthentikUrl` muestra la URL pública (http://<EIP>:9000). La inicialización del contenedor toma ~3 minutos. Para diagnosticar:

```bash
aws ssm start-session --target <instance-id>
cd /opt/authentik
docker compose logs --tail=100 -f server
```
