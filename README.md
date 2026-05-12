# Leetcode

Sistema de autenticación y autorización para una plataforma tipo LeetCode. Usa OIDC con Authorization Code + PKCE para AuthN y RBAC con tres roles (USER, SETTER, ADMIN) para AuthZ.

## Estructura del monorepo

- `infra/` — Infraestructura como código con AWS CDK en TypeScript.
- `frontend/` — SPA en React 19 + Vite + TypeScript con OIDC + PKCE y RBAC.
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

# Dependencias de infraestructura y frontend
npm --prefix infra install
npm --prefix frontend install
```

El pre-commit hook de husky ejecuta `lint-staged` automáticamente y formatea con Prettier los archivos modificados (de raíz, `infra/` y `frontend/`).

### Variables de entorno del frontend

Copia `frontend/.env.example` a `frontend/.env` y completa los valores:

- `VITE_AUTH_AUTHORITY` — URL del issuer OIDC de Authentik (output `IssuerUrl` del `ApiGatewayStack`).
- `VITE_AUTH_CLIENT_ID` — Client ID configurado en la aplicación OIDC (por defecto `leetcode`).
- `VITE_AUTH_REDIRECT_URI` — Para dev: `http://localhost:5173/auth/callback`.
- `VITE_API_BASE_URL` — Output `ApiUrl` del `ApiGatewayStack`.

```bash
npm --prefix frontend run dev   # http://localhost:5173
```

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
- **ApiGatewayStack** — HTTP API con JWT Authorizer apuntando al issuer OIDC de Authentik (`http://<EIP>:9000/application/o/leetcode/`). Expone `GET /v1/me` con una Lambda mock que devuelve los claims `sub`, `email`, `name` y `roles` del token.

## Costos aproximados (dev)

- EC2 t4g.small: ~$15/mes.
- EBS gp3 20 GB: ~$1.6/mes.
- Elastic IP (mientras esté asociada): $0.
- Secrets Manager (2 secretos): ~$0.80/mes.
- HTTP API + Lambda: ~$0 (free tier cubre desarrollo).

Total: ~$17–20/mes. Ejecutar `cdk destroy --all` al terminar la sesión para no acumular costos.

## Orden de despliegue

El `ApiGatewayStack` necesita que Authentik tenga la aplicación OIDC `leetcode` configurada (porque el JWT Authorizer hace OIDC discovery contra `<issuer>/.well-known/openid-configuration` al desplegar). Por eso el orden es:

1. `cdk deploy NetworkStack SecretsStack AuthentikStack` — levanta Authentik.
2. Esperar ~3 minutos a que arranquen los contenedores.
3. Abrir `http://<EIP>:9000`, completar el flujo inicial de Authentik y crear la aplicación OIDC con slug `leetcode` (matchea el `audience` que espera el authorizer).
4. `cdk deploy ApiGatewayStack` — ahora el discovery contra Authentik funciona.

## Acceder a Authentik

Después del primer `cdk deploy`, el output `AuthentikStack.AuthentikUrl` muestra la URL pública (http://<EIP>:9000). La inicialización del contenedor toma ~3 minutos. Para diagnosticar:

```bash
aws ssm start-session --target <instance-id>
cd /opt/authentik
docker compose logs --tail=100 -f server
```
