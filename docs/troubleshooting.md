# Troubleshooting

Issues que enfrentamos durante el desarrollo y cómo se resolvieron. Si encontrás otro, agregalo acá.

## CDK no encuentra credenciales aunque `aws sts get-caller-identity` funciona

**Síntoma**:

```
❌  Environment aws://...failed bootstrapping:
   NoCredentials: Need to perform AWS calls...,
   but no credentials have been configured
```

**Causa**: en git-bash en Windows, `$HOME` apunta a un directorio que no es donde el AWS CLI guardó las credenciales (típicamente `~/AppData/Roaming/SPB_Data/` vs `C:\Users\<user>\.aws\`). El AWS SDK que usa CDK lee `~/.aws/credentials` usando `$HOME`, no `%USERPROFILE%`.

**Fix**: exportar la ruta absoluta antes de cualquier comando CDK:

```bash
export AWS_SHARED_CREDENTIALS_FILE="/c/Users/<user>/.aws/credentials"
export AWS_CONFIG_FILE="/c/Users/<user>/.aws/config"
```

## Dependency cycle al añadir `addRotationSingleUser` a la RDS

**Síntoma** (versión vieja con `DatabaseStack`):

```
DependencyCycle: 'NetworkStack' depends on 'DatabaseStack'
(NetworkStack -> DatabaseStack/AuthentikDb/Resource.Endpoint.Port).
Adding this dependency (DatabaseStack -> NetworkStack/Vpc/dataSubnet1/Subnet.Ref)
would create a cyclic reference.
```

**Causa**: cuando creás un SG en `NetworkStack` y lo pasás a `DatabaseStack`, y después `addRotationSingleUser` agrega ingress rules a ese SG referenciando recursos de `DatabaseStack`, CDK crea una referencia circular.

**Fix**: cada stack es dueño de sus propios security groups. El SG de la DB se crea en `DatabaseStack`, no en `NetworkStack`.

> En la arquitectura actual (post-refactor a infra minimal) ya no hay `DatabaseStack`. Postgres vive como contenedor dentro del EC2 de Authentik.

## Tests de jest devuelven datos viejos después de modificar el código

**Síntoma**: editás `network-stack.ts` y los tests siguen viendo la versión anterior (cantidad de subnets, NATs, etc.).

**Causa**: `npm run build` ejecutó `tsc` que dejó archivos `.js` compilados en `lib/stacks/*.js`. ts-jest a veces prefiere esos `.js` sobre los `.ts` fuente.

**Fix** (en el repo `AWS_Leetcode`):

```bash
find lib bin -name "*.js" -delete
find lib bin -name "*.d.ts" -delete
```

Estos archivos ya están en `.gitignore`, así que nunca van a git. Pero hay que limpiarlos del filesystem local cuando aparecen.

## Prettier reporta CRLF/LF inconsistencias en Windows

**Síntoma**: `npm run format:check` falla con warnings sobre line endings en archivos que Prettier ya ha tocado.

**Fix**: `endOfLine: "auto"` en `.prettierrc.json` (en cada repo). Acepta el line ending del sistema sin forzar conversión.

## Authentik 2024.x no pide setup inicial — pide login directo

**Síntoma**: al abrir `http://<IP>:9000` te redirige a `/flows/-/default/authentication/`, no a `/if/flow/initial-setup/`.

**Causa**: Authentik 2024.x viene con `akadmin` pre-creado con un password aleatorio. El "initial setup" wizard no existe.

**Fix**: generar un recovery link vía SSM, abrir el URL para setear el password. Comando completo en [`docs/setup.md`](setup.md) paso 3.

## Authentik responde **403** al hacer login en la aplicación

**Síntoma**: el browser termina en `http://localhost:5173/403` después de un login exitoso en Authentik.

**Posibles causas**:

1. La app `leetcode` no tiene **policy/group bindings**. Authentik 2024+ requiere al menos un binding para autorizar acceso.
2. El frontend no pide el scope `roles`, por lo que el id_token no trae el claim, los guards `RequireRole` ven `roles: []` y redirigen a `/403`.

**Fix 1** (bindings): ir a Applications → LeetCode → Policy/Group/User Bindings, agregar binding por cada grupo (USER, SETTER, ADMIN). En el blueprint, esto ya está incluido en las entries `authentik_policies.policybinding`.

**Fix 2** (scope): en `frontend/src/auth/oidc-config.ts`, el campo `scope` debe incluir `roles`:

```typescript
scope: 'openid profile email roles offline_access',
```

Para verificar en runtime: DevTools → Network → request a `/authorize` → query param `scope` debe llevar `roles`.

## `cdk deploy ApiGatewayStack` falla con "Invalid issuer"

**Síntoma**:

```
CREATE_FAILED ... AWS::ApiGatewayV2::Authorizer:
"Invalid issuer: Issuer is not a valid URL for JWT Authorizer"
```

**Causa**: el `HttpJwtAuthorizer` nativo de API Gateway exige que el issuer sea **HTTPS**. Nuestro Authentik corre en HTTP por simplicidad.

**Fix**: usar `HttpLambdaAuthorizer` con una Lambda que valida el JWT manualmente contra el JWKS. Ya está implementado en `AWS_Leetcode/lib/stacks/api-gateway-stack.ts`. La Lambda:

- Decodifica header, payload, signature.
- Valida `iss`, `aud`, `exp`.
- Descarga el JWKS (con cache de 5 min).
- Encuentra la public key por `kid`.
- Verifica firma RS256 con `crypto.createPublicKey({ format: 'jwk' })`.

## Lambda authorizer retorna 401 vs 403

**Comportamiento normal**:

- `401 Unauthorized` — request sin token (`Authorization` header faltante o no empieza con `Bearer`).
- `403 Forbidden` — token presente pero inválido (firma incorrecta, expirado, issuer/audience no matchean).

Ambos son rechazos esperados; el código del Lambda authorizer devuelve `{ isAuthorized: false }` en ambos casos y API Gateway hace la distinción HTTP.

## El frontend pierde la sesión al refrescar la página

**Comportamiento esperado**. Los tokens están en `InMemoryWebStorage`, no se persisten. Refrescar borra el estado del SPA.

Si querés persistencia entre refreshes (a costa de exponer tokens a XSS), cambiá `userStore` a `WebStorageStateStore({ store: window.sessionStorage })` o `localStorage`. Por seguridad del brief original, **no se recomienda**.

`automaticSilentRenew` solo renueva mientras la página esté abierta — no rescata después de un refresh.

## Logs útiles para debug

### Logs del UserData (durante el primer arranque de la EC2)

```bash
aws ssm start-session --target <instance-id>
sudo tail -f /var/log/cloud-init-output.log
```

### Logs de Authentik

```bash
aws ssm start-session --target <instance-id>
cd /opt/authentik
docker compose logs -f server          # API y UI
docker compose logs -f worker          # blueprints, jobs background
docker compose logs --tail=100 worker | grep -i blueprint
```

### Logs del Lambda Authorizer

```bash
aws logs tail /aws/lambda/ApiGatewayStack-AuthorizerHandler... --follow --region us-east-1
```

### Decodificar un JWT en el navegador

En DevTools → Network → request `/token` → response → copiar `id_token`. En la Console:

```javascript
const idToken = '...'; // el id_token largo
JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
```

Te muestra `sub`, `email`, `name`, `roles`, `iss`, `aud`, `exp`, etc.

## Decodificar un secreto de Secrets Manager

```bash
aws secretsmanager get-secret-value --secret-id authentik/secret-key --query SecretString --output text
```

(Solo si tu IAM tiene permiso. El IAM role de la EC2 tiene este permiso para `authentik/secret-key`.)
