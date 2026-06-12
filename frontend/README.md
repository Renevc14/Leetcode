# @leetcode/frontend

Frontend tipo LeetCode (React 19 + TypeScript + Vite) que consume los 4 microservicios
Smithy del repo: problems (3001), users (3002), submissions (3003) y contests (3004).

## Stack

- React 19 + TypeScript + Vite
- React Router v6, TanStack Query v5, Axios, Zustand (sesión)
- Monaco Editor (`@monaco-editor/react`) con tema `vs-dark`
- Tailwind CSS + componentes estilo shadcn/ui (cva + Radix)

## Desarrollo

Desde la raíz del workspace:

```bash
pnpm install
pnpm --filter @leetcode/frontend dev    # http://localhost:5173
pnpm --filter @leetcode/frontend build
```

Requiere los microservicios corriendo en los puertos 3001–3004. El proxy de Vite
(`vite.config.ts`) reescribe `/api/<servicio>/...` → `http://localhost:300X/v1/...`,
por lo que no hay problemas de CORS.

## Pantallas

| Ruta                                              | Descripción                                                                        |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `/problems`                                       | Catálogo con filtro por dificultad, categorías y acceptance rate real              |
| `/problems/:id`                                   | Vista de 3 paneles: enunciado/casos públicos · Monaco · resultados con polling 1 s |
| `/profile/:userId`                                | Perfil + stats reales (`/v1/users/{id}/stats`) e historial de envíos               |
| `/contests`                                       | Concursos por estado (Upcoming/Live/Finished) con countdown en vivo                |
| `/contests/:id`                                   | Detalle, enroll/unenroll, problemas y leaderboard paginado                         |
| `/admin/problems/new`, `/admin/problems/:id/edit` | CRUD de problemas (PATCH disable)                                                  |
| `/admin/contests/new`                             | Creación de concursos con selección de problemas                                   |

## Autenticación (temporal)

El backend aún no expone register/login (la auth real vendrá de un servicio OIDC
externo). `/login` ofrece una sesión demo validada contra los usuarios semilla del
users-service (`user-001`…`user-003`); el token demo se envía como `Authorization:
Bearer` en cada request. Cuando se integre OIDC, basta reemplazar `src/store/useAuthStore.ts`
y las páginas `LoginPage`/`RegisterPage`.
