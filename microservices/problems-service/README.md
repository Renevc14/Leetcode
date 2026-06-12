# Problems Service

This service implements the problems catalog API using the generated `@leetcode/problems-server-sdk` package and Prisma for persistence.

## Architecture and Layer Responsibilities

### `src/index.ts`

- Transport layer for HTTP server startup.
- Configures the Smithy-generated handler: `getProblemsApiServiceHandler()`.
- Builds the shared service context with `createInitialContext()`.
- Keeps request/response wiring isolated from business logic.

### `src/context.ts`

- Composition root for the problems service runtime context.
- Instantiates the Prisma-backed repository and exposes it as `ProblemsContext`.
- Keeps infrastructure wiring separate from application logic.

### `src/services/ProblemsApiServiceImpl.ts`

- Application service layer implementing the generated SDK contract.
- Each method corresponds to a Smithy operation:
  - `ListProblems`
  - `GetProblem`
  - `CreateProblem`
  - `UpdateProblem`
  - `DeleteProblem`
- Coordinates validation, repository calls, mapping, and error translation.
- Keeps business flow thin and delegating.

### `src/application/problems-repository.ts`

- Defines repository interfaces and application-level data contracts.
- Declares `ProblemsRepository` operations needed by the service layer.
- Keeps the application interface independent of Prisma.

### `src/infrastructure/prisma/problems-repository.ts`

- Prisma implementation of the repository interface.
- Owns database query logic, transactions, and relational joins.
- Includes only persistence concerns, not API response formatting.

### `src/mappers/problem-mapper.ts`

- Maps domain aggregates into generated SDK response models.
- Centralizes translation of Prisma domain objects to API output shapes.
- Keeps API contract formatting separate from persistence.

### `src/domain/validation.ts`

- Runtime input validation and guard helpers.
- Enforces required fields, list normalization, and business validation rules.
- Uses generated SDK `ValidationException` for runtime failures.

### `src/domain/error-translation.ts`

- Translates unexpected internal errors into generated SDK error types.
- Preserves generated service errors and maps Prisma/unknown errors safely.

## Dependency Direction

The service follows a layered direction:

- `src/index.ts` → `src/context.ts` → `src/services/ProblemsApiServiceImpl.ts`
- `src/services/ProblemsApiServiceImpl.ts` → `src/domain/validation.ts`
- `src/services/ProblemsApiServiceImpl.ts` → `src/application/problems-repository.ts`
- `src/services/ProblemsApiServiceImpl.ts` → `src/mappers/problem-mapper.ts`
- `src/context.ts` → `src/infrastructure/prisma/problems-repository.ts`
- `src/infrastructure/prisma/problems-repository.ts` → `src/lib/prisma.ts`

This ensures the transport layer depends on the application layer, the application layer depends on the repository interface, and the infrastructure layer depends on the concrete Prisma implementation.

## API Endpoints

The service exposes the following endpoints via Smithy-generated routing.

### List Problems

- Method: `GET`
- Path: `/v1/problems`
- Query parameters:
  - `cursor` (optional)
  - `limit` (optional)
  - `difficulty` (optional): `EASY`, `MEDIUM`, `HARD`
  - `category` (optional)
  - `status` (optional): `NOT_ATTEMPTED`, `ATTEMPTED`, `SOLVED`

Example:

```bash
curl "http://localhost:3001/v1/problems?limit=10&difficulty=EASY"
```

Example response:

```json
{
  "items": [
    {
      "id": "...",
      "slug": "two-sum",
      "title": "Two Sum",
      "difficulty": "EASY",
      "categories": ["arrays", "hash-table"],
      "acceptanceRate": 0
    }
  ],
  "nextCursor": "..."
}
```

### Get Problem

- Method: `GET`
- Path: `/v1/problems/{problemId}`

Example:

```bash
curl "http://localhost:3001/v1/problems/prob-001"
```

Example response:

```json
{
  "id": "prob-001",
  "slug": "two-sum",
  "title": "Two Sum",
  "descriptionMd": "...",
  "constrainsMd": "...",
  "difficulty": "EASY",
  "timeLimitMs": 1000,
  "memoryLimitMb": 256,
  "allowedLanguages": ["PYTHON", "JAVA"],
  "categories": ["arrays", "hash-table"],
  "acceptanceRate": 0,
  "publicTestCases": [{ "input": "[2,7,11,15]\n9", "expectedOutput": "[0,1]" }]
}
```

### Create Problem

- Method: `POST`
- Path: `/v1/problems`
- Body: JSON payload matching `CreateProblemServerInput`

Example:

```bash
curl -X POST http://localhost:3001/v1/problems \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "two-sum",
    "title": "Two Sum",
    "descriptionMd": "...",
    "constraintsMd": "...",
    "difficulty": "EASY",
    "categories": ["arrays", "hash-table"],
    "timeLimitMs": 1000,
    "memoryLimitMb": 256,
    "allowedLanguages": ["PYTHON", "JAVA"],
    "testCases": [
      { "input": "[2,7,11,15]\n9", "expectedOutput": "[0,1]", "isSample": true },
      { "input": "[3,3]\n6", "expectedOutput": "[0,1]", "isSample": false }
    ]
  }'
```

Example response:

```json
{
  "id": "...",
  "slug": "two-sum",
  "title": "Two Sum",
  "descriptionMd": "...",
  "constrainsMd": "...",
  "difficulty": "EASY",
  "timeLimitMs": 1000,
  "memoryLimitMb": 256,
  "allowedLanguages": ["PYTHON", "JAVA"],
  "categories": ["arrays", "hash-table"],
  "acceptanceRate": 0,
  "publicTestCases": [{ "input": "[2,7,11,15]\n9", "expectedOutput": "[0,1]" }]
}
```

### Update Problem

- Method: `PATCH`
- Path: `/v1/problems/{problemId}`
- Body: JSON payload with any updatable fields

Example:

```bash
curl -X PATCH http://localhost:3001/v1/problems/prob-001 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Two Sum Updated",
    "difficulty": "MEDIUM"
  }'
```

### Delete Problem

- Method: `DELETE`
- Path: `/v1/problems/{problemId}`

Example:

```bash
curl -X DELETE http://localhost:3001/v1/problems/prob-001
```

This endpoint performs a soft delete by marking the problem as deleted and unpublished.
