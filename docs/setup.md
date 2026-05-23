# Setup y despliegue

Guía paso a paso desde cero. Asume Windows con Git Bash o PowerShell; Linux/macOS es equivalente con paths nativos.

## Prerequisitos

- **Node.js 20+** y **npm 10+** (verificar con `node --version && npm --version`).
- **AWS CDK CLI**: `npm install -g aws-cdk` (≥ 2.1100).
- **AWS CLI v2** configurada con credenciales válidas:

  ```bash
  aws configure
  # AWS Access Key ID:       <tu access key>
  # AWS Secret Access Key:   <tu secret>
  # Default region name:     us-east-1
  # Default output format:   json

  aws sts get-caller-identity   # debe devolver tu cuenta
  ```

- **GitHub CLI** (`gh`) opcional pero útil para abrir PRs sin salir del terminal.
- **git** configurado con `user.name` y `user.email`.

## Setup local

```bash
git clone https://github.com/Renevc14/Leetcode.git
cd Leetcode

# Dependencias de la raíz (husky, lint-staged, prettier)
npm install

# Dependencias de infra y frontend
npm --prefix infra install
npm --prefix frontend install
```

El pre-commit hook de husky se activa al `npm install` de la raíz.

## Validación local sin desplegar

```bash
# Lint y tests de infra
npm --prefix infra run lint
npm --prefix infra run format:check
npm --prefix infra test                          # 16/16 tests

# Sintetizar templates CloudFormation sin desplegar
npm --prefix infra exec cdk synth --all

# Build y lint del frontend
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Despliegue completo

### Paso 1 — Bootstrap del entorno (una sola vez por cuenta/región)

```bash
npm --prefix infra exec cdk bootstrap
```

Crea un bucket S3 (`cdk-hnb659fds-assets-<account>-<region>`) y roles IAM. Costo casi cero. Idempotente.

### Paso 2 — Deploy de la infra base + Authentik

```bash
npm --prefix infra exec cdk deploy NetworkStack SecretsStack AuthentikStack --require-approval never
```

Tarda ~3 minutos. Salida relevante:

```
AuthentikStack.AuthentikUrl = http://<IP>:9000
AuthentikStack.InstanceId   = i-xxxxxxxxxxxxxx
AuthentikStack.PublicIp     = <IP>
```

Guardá esos valores.

### Paso 3 — Esperar arranque y generar password de `akadmin`

El UserData de la EC2 instala Docker, descarga las imágenes y arranca los contenedores. Tarda **~3 minutos** desde el deploy. Verificá:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://<IP>:9000
# Cuando devuelva 302, está listo
```

Authentik 2024.x no expone el password de `akadmin` en logs. Generá un link de recovery temporal vía SSM:

```bash
aws ssm send-command \
  --instance-ids <InstanceId> \
  --region us-east-1 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /opt/authentik && docker compose exec -T worker ak create_recovery_key 24 akadmin"]' \
  --output text --query "Command.CommandId"

# Esperá ~5 segundos, después leé el output:
aws ssm get-command-invocation \
  --command-id <command-id> \
  --instance-id <InstanceId> \
  --region us-east-1 \
  --query "StandardOutputContent" --output text
```

El output incluye un URL relativo `/recovery/use-token/<token>/`. Construí el URL completo:

```
http://<IP>:9000/recovery/use-token/<token>/
```

Abrilo en el browser, te deja setear el password de `akadmin`.

### Paso 4 — Verificar que el blueprint corrió

Después del primer arranque, el worker procesa los blueprints de `/blueprints/`. Verificá que el de LeetCode se aplicó:

```bash
curl -s http://<IP>:9000/application/o/leetcode/.well-known/openid-configuration | head -20
```

Debe responder con `"issuer": "http://<IP>:9000/application/o/leetcode/"` y `"scopes_supported": ["roles", "openid", "email", "profile"]`.

Si la app `leetcode` no existe, el blueprint falló. Mirá los logs del worker:

```bash
aws ssm start-session --target <InstanceId> --region us-east-1
# Dentro:
sudo docker compose -f /opt/authentik/docker-compose.yml logs --tail=200 worker | grep -i blueprint
```

### Paso 5 — Deploy del ApiGatewayStack

```bash
npm --prefix infra exec cdk deploy ApiGatewayStack --require-approval never
```

Tarda ~1 minuto. Salida:

```
ApiGatewayStack.ApiUrl    = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
ApiGatewayStack.IssuerUrl = http://<IP>:9000/application/o/leetcode/
```

Probá el rechazo de requests sin token:

```bash
curl -i https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/v1/me
# HTTP/2 401
```

### Paso 6 — Configurar el frontend

```bash
cp frontend/.env.example frontend/.env
```

Editá `frontend/.env` con los valores reales:

```
VITE_AUTH_AUTHORITY=http://<IP>:9000/application/o/leetcode/
VITE_AUTH_CLIENT_ID=leetcode
VITE_AUTH_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_API_BASE_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
```

Arrancá el dev server:

```bash
npm --prefix frontend run dev
```

Abre http://localhost:5173.

### Paso 7 — Validar el flow E2E

| Acción                             | Resultado esperado                                             |
| ---------------------------------- | -------------------------------------------------------------- |
| Click "Iniciar sesión"             | Redirige a `http://<IP>:9000/application/o/authorize/...`      |
| Login con `test-user` / `Test123!` | Redirige a `/auth/callback` y de ahí a `/` con email en el nav |
| Ir a `/submit`, click "Enviar"     | Muestra "Submission enviada por test-user@example.com (sub=…)" |
| Ir a `/setter`                     | Redirige a `/403` (test-user no tiene SETTER)                  |
| Logout, login con `test-setter`    | `/submit` y `/setter` accesibles; `/admin` da 403              |
| Logout, login con `test-admin`     | Las cuatro rutas accesibles                                    |

## Bajar la infra

Cuando termines, para no acumular costos:

```bash
npm --prefix infra exec cdk destroy --all --force
```

Tarda ~3 minutos. Lo que **no** se borra:

- El bootstrap (`CDKToolkit`) — costo despreciable, útil para futuros deploys.
- Los secrets entran en "scheduled deletion" con recovery window de 7–30 días (~$0.30 total durante ese período). Se pueden eliminar inmediatamente con `aws secretsmanager delete-secret --secret-id <name> --force-delete-without-recovery`.

## Re-deploy futuro

El blueprint hace que el segundo deploy y siguientes sean prácticamente automáticos:

1. `cdk deploy --all`
2. Esperar ~3 min.
3. Generar password de `akadmin` con SSM (paso 3 de arriba).
4. Actualizar `frontend/.env` con la nueva EIP y nueva URL de API.
5. `npm --prefix frontend run dev`.

No hay que volver a tocar la UI de Authentik para crear provider/app/grupos/users.
