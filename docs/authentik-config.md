# Configuración manual de Authentik

> Esta guía es un **fallback**. Normalmente el blueprint `assets/authentik/blueprints/leetcode.yaml` (en el repo [AWS_Leetcode](https://github.com/Renevc14/AWS_Leetcode)) hace todo esto solo al arrancar el container. Úsala si:
>
> - El blueprint falló (ver logs del worker en `docker compose logs worker | grep blueprint`).
> - Necesitás modificar la config en una instancia ya corriendo.
> - Estás aprendiendo cómo funciona Authentik por dentro.

## Setup inicial del admin

La primera vez que abrís `http://<IP>:9000` Authentik 2024.x no muestra el setup wizard — viene con `akadmin` pre-creado con un password aleatorio que no se imprime en logs.

Generá un recovery link vía SSM:

```bash
aws ssm send-command --instance-ids <id> --region us-east-1 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /opt/authentik && docker compose exec -T worker ak create_recovery_key 24 akadmin"]'
```

Leé el output, construí `http://<IP>:9000/recovery/use-token/<token>/`, abrilo, setea el password.

## 1 · Crear los grupos

**Sidebar → Directory → Groups → Create**.

Crear tres: `USER`, `SETTER`, `ADMIN`. Sin `is_superuser`, sin attrs extras.

## 2 · Crear el Property Mapping de `roles`

**Sidebar → Customisation → Property Mappings → Create → Scope Mapping**.

| Campo       | Valor                                  |
| ----------- | -------------------------------------- |
| Name        | `Roles Mapping`                        |
| Scope name  | `roles`                                |
| Description | Claim custom con los roles del usuario |
| Expression  | (ver abajo)                            |

```python
return {
    "roles": [group.name for group in user.ak_groups.all()],
}
```

## 3 · Crear el Provider OIDC

**Sidebar → Applications → Providers → Create → OAuth2/OpenID Provider → Next**.

| Campo              | Valor                                                      |
| ------------------ | ---------------------------------------------------------- |
| Name               | `leetcode-provider`                                        |
| Authorization flow | `default-provider-authorization-implicit-consent`          |
| Client type        | **Public** ← crítico para PKCE                             |
| Client ID          | `leetcode`                                                 |
| Client Secret      | (vacío — Public clients no usan secret)                    |
| Redirect URIs      | `http://localhost:5173/auth/callback`, Match mode `Strict` |
| Signing Key        | `authentik Self-signed Certificate`                        |

En **Advanced protocol settings**:

| Campo                      | Valor                           |
| -------------------------- | ------------------------------- |
| Subject mode               | `Based on the User's hashed ID` |
| Include claims in id_token | ✓                               |

En **Property mappings → Scopes**, dejar los default (`openid`, `email`, `profile`) y agregar `Roles Mapping`.

→ **Create**.

## 4 · Crear la Application

**Sidebar → Applications → Applications → Create**.

| Campo      | Valor                                                 |
| ---------- | ----------------------------------------------------- |
| Name       | `LeetCode`                                            |
| Slug       | `leetcode` ← debe matchear `audience` del API Gateway |
| Provider   | `leetcode-provider`                                   |
| Launch URL | `http://localhost:5173/`                              |

→ **Create**.

## 5 · Bindear los grupos a la App

Sin bindings, Authentik responde **403** al intentar entrar a la app. Hay que crear uno por grupo:

**Applications → Applications → LeetCode → Policy / Group / User Bindings → Bind existing group**.

Hacelo tres veces con `USER`, `SETTER` y `ADMIN`. Order va incrementando (0, 1, 2). `Enabled: ✓`.

## 6 · Crear los usuarios de prueba

**Sidebar → Directory → Users → Create** (tres veces):

| Username      | Email                     | Name        | Grupos                    |
| ------------- | ------------------------- | ----------- | ------------------------- |
| `test-user`   | `test-user@example.com`   | Test User   | `USER`                    |
| `test-setter` | `test-setter@example.com` | Test Setter | `USER`, `SETTER`          |
| `test-admin`  | `test-admin@example.com`  | Test Admin  | `USER`, `SETTER`, `ADMIN` |

Después de crear cada uno, abrirlo → **Set password** → `Test123!` (o el que prefieras) → en **Groups** asignar los grupos correspondientes.

## 7 · Verificar

```bash
curl -s http://<IP>:9000/application/o/leetcode/.well-known/openid-configuration
```

Debe responder con:

- `"issuer": "http://<IP>:9000/application/o/leetcode/"`
- `"scopes_supported"` que incluya `"roles"` (junto con `openid`, `email`, `profile`)
- `"claims_supported"` que incluya `"roles"`

Si no incluye `roles`, el mapper no está asociado al provider — volver al paso 3 y revisar Property mappings → Scopes.

## Renombrar/agregar al blueprint

Si modificás algo manualmente y querés que sobreviva a un re-deploy, agrega/edita la entry correspondiente en `AWS_Leetcode/assets/authentik/blueprints/leetcode.yaml`. Los modelos relevantes:

- `authentik_core.group`
- `authentik_core.user`
- `authentik_providers_oauth2.oauth2provider`
- `authentik_providers_oauth2.scopemapping`
- `authentik_core.application`
- `authentik_policies.policybinding`

Sintaxis `!Find [model, [campo, valor]]` resuelve referencias en tiempo de carga del blueprint.

Doc oficial de blueprints: https://docs.goauthentik.io/docs/customize/blueprints
