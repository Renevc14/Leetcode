# Submissions Service

This service implements the code submissions API using the generated `@leetcode/submissions-server-sdk` package and Prisma for persistence.

It covers ephemeral code execution against public test cases (`RunCode`), persistent submissions with judging (`Submit`), and the authenticated user's submission history (`ListSubmissions`, `GetSubmission`).

## Architecture and Layer Responsibilities

### `src/index.ts`

- Transport layer for HTTP server startup.
- Configures the Smithy-generated handler: `getSubmissionsApiServiceHandler()`.
- Builds the per-request service context with `createRequestContext()`.
- Keeps request/response wiring isolated from business logic.

### `src/context.ts`

- Composition root for the submissions service runtime context.
- Instantiates the Prisma-backed repository and exposes it as `SubmissionsContext`.
- Extracts the authenticated user id from the `Authorization: Bearer` JWT (`sub` claim).
- Keeps infrastructure wiring separate from application logic.

### `src/application/SubmissionsApiServiceImpl.ts`

- Application service layer implementing the generated SDK contract.
- Each method corresponds to a Smithy operation:
  - `RunCode`
  - `Submit`
  - `ListSubmissions`
  - `GetSubmission`
- Coordinates authentication, judging, repository calls, mapping, and error translation.
- Keeps business flow thin and delegating.

### `src/application/judge.ts`

- Inline stub judge that synchronously produces a verdict without executing code.
- Single seam intended to be replaced by a real code-execution/judge service.
- Returns a deterministic status plus public test-case results.

### `src/application/submissions-repository.ts`

- Defines repository interfaces and application-level data contracts.
- Declares `SubmissionsRepository` operations needed by the service layer.
- Keeps the application interface independent of Prisma.

### `src/persistence/prisma/submissions-repository.ts`

- Prisma implementation of the repository interface.
- Owns database query logic, nested test-case writes, and keyset pagination.
- Includes only persistence concerns, not API response formatting.

### `src/persistence/prisma/client.ts`

- Prisma client initialization and database connection wiring.
- Creates the `PrismaClient` instance used by the repository.
- Isolated from application logic.

### `src/domain/submission.ts`

- Domain aggregates decoupled from the Prisma schema.
- Declares `SubmissionAggregate`, `SubmissionSummaryItem`, and `TestCaseResultItem`.

### `src/application/submission-mapper.ts`

- Maps domain aggregates into generated SDK response models.
- Centralizes translation of domain objects to API output shapes.
- Keeps API contract formatting separate from persistence.

### `src/application/errors.ts`

- Re-exports SDK service errors.
- Exposes `throwIfKnownServiceError` to preserve service error semantics.

### `src/persistence/prisma/error-handlers.ts`

- Detects Prisma error codes and maps them to SDK errors.
- Converts unexpected persistence failures into safe service errors.

## Dependency Direction

The service follows a layered direction:

- `src/index.ts` → `src/context.ts` → `src/application/SubmissionsApiServiceImpl.ts`
- `src/application/SubmissionsApiServiceImpl.ts` → `src/application/judge.ts`
- `src/application/SubmissionsApiServiceImpl.ts` → `src/application/submissions-repository.ts`
- `src/application/SubmissionsApiServiceImpl.ts` → `src/application/submission-mapper.ts`
- `src/context.ts` → `src/persistence/prisma/submissions-repository.ts`
- `src/persistence/prisma/submissions-repository.ts` → `src/persistence/prisma/client.ts`

This ensures the transport layer depends on the application layer, the application layer depends on the repository interface, and the infrastructure layer depends on the concrete Prisma implementation.

## Authentication

All operations require a bearer token. The user id is taken directly from the JWT `sub` claim and used as the owner of every submission. Requests without a valid `Authorization: Bearer <token>` header are rejected with `UnauthorizedError`. `GetSubmission` additionally enforces ownership and returns `ForbiddenError` for submissions belonging to another user.

```bash
curl "http://localhost:3003/v1/submissions" \
  -H "Authorization: Bearer <token>"
```

> Note: `problemId`, `contestId`, and `submissionId` must be UUIDs (enforced by the Smithy model).

## API Endpoints

The service exposes the following endpoints via Smithy-generated routing.

### Run Code

- Method: `POST`
- Path: `/v1/submissions/run`
- Body: JSON payload matching `RunCodeServerInput`
- Ephemeral execution against public test cases. Nothing is persisted; the returned id is transient.

Example:

```bash
curl -X POST http://localhost:3003/v1/submissions/run \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "problemId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "language": "PYTHON",
    "code": "print(1)"
  }'
```

Example response:

```json
{
  "submissionId": "3e2b95a1-397d-4340-82e7-89a7d138362a",
  "status": "PENDING"
}
```

### Submit

- Method: `POST`
- Path: `/v1/submissions`
- Body: JSON payload matching `SubmitServerInput`
- Persists the submission, judges it, and stores per-test-case results. `contestId` is optional.

Example:

```bash
curl -X POST http://localhost:3003/v1/submissions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "problemId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "language": "PYTHON",
    "code": "print(2)"
  }'
```

Example response:

```json
{
  "submissionId": "f951e1ba-9116-45ff-9e84-3a9f7a638ed3",
  "status": "ACCEPTED"
}
```

### List Submissions

- Method: `GET`
- Path: `/v1/submissions`
- Scoped to the authenticated user.
- Query parameters:
  - `cursor` (optional): opaque keyset cursor from a previous page
  - `limit` (optional): page size (default 20, max 100)
  - `problemId` (optional)
  - `contestId` (optional)
  - `status` (optional): `PENDING`, `ACCEPTED`, `WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`, `MEMORY_LIMIT_EXCEEDED`, `RUNTIME_ERROR`, `COMPILATION_ERROR`

Example:

```bash
curl "http://localhost:3003/v1/submissions?limit=10&status=ACCEPTED" \
  -H "Authorization: Bearer <token>"
```

Example response:

```json
{
  "items": [
    {
      "id": "f951e1ba-9116-45ff-9e84-3a9f7a638ed3",
      "problemId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "userId": "...",
      "language": "PYTHON",
      "status": "ACCEPTED",
      "timeMs": 27,
      "memoryMb": 9,
      "submittedAt": "2026-06-13T07:46:02.648Z",
      "judgedAt": "2026-06-13T07:46:02.362Z"
    }
  ],
  "nextCursor": "..."
}
```

Submissions are returned newest first. When `nextCursor` is present, pass it back as the `cursor` query parameter to fetch the next page; it is absent on the last page.

### Get Submission

- Method: `GET`
- Path: `/v1/submissions/{submissionId}`
- Returns the full submission, including source code and per-test-case results. Only the owner may access it.

Example:

```bash
curl "http://localhost:3003/v1/submissions/f951e1ba-9116-45ff-9e84-3a9f7a638ed3" \
  -H "Authorization: Bearer <token>"
```

Example response:

```json
{
  "id": "f951e1ba-9116-45ff-9e84-3a9f7a638ed3",
  "problemId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "userId": "...",
  "language": "PYTHON",
  "code": "print(2)",
  "status": "ACCEPTED",
  "timeMs": 27,
  "memoryMb": 9,
  "submittedAt": "2026-06-13T07:46:02.648Z",
  "judgedAt": "2026-06-13T07:46:02.362Z",
  "testCaseResults": [
    {
      "testCaseId": "11111111-1111-4111-8111-111111111111",
      "status": "ACCEPTED",
      "executionTimeMs": 12,
      "memoryUsageMb": 8,
      "actualOutput": "ok"
    }
  ]
}
```

## Local Development

The service connects to its own PostgreSQL instance (port `5434`, see `compose.yaml` and `.env.example`).

```bash
# Start the database
docker compose up -d submissions-postgres

# Apply migrations and seed
pnpm --filter @leetcode/submissions-service exec prisma migrate dev
pnpm --filter @leetcode/submissions-service exec prisma db seed

# Run the service (defaults to port 3003, override with PORT)
pnpm --filter @leetcode/submissions-service dev

# Run the async judge worker
pnpm --filter @leetcode/submissions-service dev:worker
```

> Note: the submissions service depends on Redis and the executor/problems services. Review `microservices/submissions-service/.env.example` for `REDIS_URL`, `PROBLEMS_URL`, `EXECUTOR_URL`, and `EXECUTOR_SHARED_SECRET`.
