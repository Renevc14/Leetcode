# Users Service

This service implements the users API using the generated `@leetcode/users-server-sdk` package and Prisma for persistence.

## Architecture and Layer Responsibilities

### `src/index.ts`

- Transport layer for HTTP server startup.
- Configures the Smithy-generated handler: `getUsersApiServiceHandler()`.
- Converts Node HTTP requests into Smithy HTTP requests and writes the resulting response.
- Extracts the per-request context via `createRequestContext()`.
- Keeps request/response wiring isolated from business logic.

### `src/context.ts`

- Composition root for the users service runtime context.
- Instantiates the Prisma-backed repository and exposes it as `UsersContext`.
- Extracts the JWT Bearer token from the `Authorization` header and parses the `sub` claim as the authenticated subject.
- Keeps identity extraction and infrastructure wiring separate from application logic.

### `src/application/UsersApiServiceImpl.ts`

- Application service layer implementing the generated SDK contract.
- Each method corresponds to a Smithy operation:
  - `GetMe`
  - `GetUser`
  - `GetMyProblemStatuses`
  - `RecordProblemStatus`
- Guards authenticated operations using the extracted principal.
- Coordinates repository calls, mapping, and error translation.

### `src/application/users-repository.ts`

- Defines the repository interface and application-level data contracts.
- Declares `UsersRepository` operations needed by the service layer.
- Keeps the application interface independent of Prisma.

### `src/persistence/prisma/users-repository.ts`

- Prisma implementation of the repository interface.
- Owns database query logic and domain mapping from Prisma records.
- Includes only persistence concerns, not API response formatting.
- Implements idempotent problem-status writes that never downgrade a solved problem.

### `src/persistence/prisma/client.ts`

- Prisma client initialization and database connection wiring.
- Creates the `PrismaClient` instance used by the repository.
- Isolated from application logic.

### `src/application/user-mapper.ts`

- Maps domain aggregates into generated SDK response models.
- Centralizes translation of `UserAggregate` and `UserProblemStatusItem` to API output shapes.
- Keeps API contract formatting separate from persistence.

### `src/domain/user.ts`

- Defines `UserAggregate` and `UserProblemStatusItem` as application-level domain types.
- Decouples the application layer from Prisma-generated types.

### `src/application/errors.ts`

- Re-exports SDK service errors.
- Exposes `throwIfKnownServiceError` to preserve service error semantics across layers.

### `src/persistence/prisma/error-handlers.ts`

- Detects Prisma error codes and maps them to SDK errors.
- Converts unexpected persistence failures into safe service errors.

## Dependency Direction

The service follows a layered direction:

- `src/index.ts` → `src/context.ts` → `src/application/UsersApiServiceImpl.ts`
- `src/application/UsersApiServiceImpl.ts` → `src/application/users-repository.ts`
- `src/application/UsersApiServiceImpl.ts` → `src/application/user-mapper.ts`
- `src/context.ts` → `src/persistence/prisma/users-repository.ts`
- `src/persistence/prisma/users-repository.ts` → `src/persistence/prisma/client.ts`

This ensures the transport layer depends on the application layer, the application layer depends on the repository interface, and the infrastructure layer depends on the concrete Prisma implementation.

## API Endpoints

The service exposes the following endpoints via Smithy-generated routing.

- Authenticated endpoints require an `Authorization: Bearer <jwt>` header.
- The service parses the JWT payload and uses the `sub` claim as the authenticated subject.

### Get Me

- Method: `GET`
- Path: `/v1/users/me`
- Auth: Required

Example:

```bash
curl "http://localhost:3004/v1/users/me" \
  -H "Authorization: Bearer <jwt>"
```

Example response:

```json
{
  "id": "...",
  "userName": "testuser",
  "displayName": "Test User",
  "email": "testuser@example.com",
  "bio": "Just a test user for development.",
  "avatarUrl": "https://example.com/avatar.jpg",
  "countryCode": "MX"
}
```

### Get User

- Method: `GET`
- Path: `/v1/users/{userId}`
- Auth: Optional

Example:

```bash
curl "http://localhost:3004/v1/users/some-user-id"
```

Example response:

```json
{
  "id": "some-user-id",
  "userName": "testuser",
  "displayName": "Test User",
  "bio": "Just a test user for development.",
  "avatarUrl": "https://example.com/avatar.jpg",
  "countryCode": "MX"
}
```

### Get My Problem Statuses

- Method: `GET`
- Path: `/v1/users/me/problem-statuses`
- Auth: Required

Example:

```bash
curl "http://localhost:3004/v1/users/me/problem-statuses" \
  -H "Authorization: Bearer <jwt>"
```

Example response:

```json
{
  "items": [
    {
      "problemId": "dummy-problem-id-001",
      "status": "SOLVED",
      "updatedAt": "2026-06-13T00:00:00.000Z"
    },
    {
      "problemId": "dummy-problem-id-002",
      "status": "ATTEMPTED",
      "updatedAt": "2026-06-13T00:00:00.000Z"
    }
  ]
}
```

### Record Problem Status

- Method: `PUT`
- Path: `/v1/users/me/problem-statuses/{problemId}`
- Auth: Required

Example:

```bash
curl "http://localhost:3004/v1/users/me/problem-statuses/dummy-problem-id-001" \
  -X PUT \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"status":"SOLVED"}'
```

Example response:

- `204 No Content`

Behavior:

- `ATTEMPTED` is written only if the user has not already solved the problem.
- `SOLVED` always persists and upgrades existing progress.
