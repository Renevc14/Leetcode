# Contests Service

Implements the contests API using the generated `@leetcode/contests-server-sdk` package and Prisma for persistence. Runs on port **3005** by default.

## Architecture and Layer Responsibilities

### `src/index.ts`

- Transport layer for HTTP server startup.
- Configures the Smithy-generated handler: `getContestsApiServiceHandler()`.
- Converts Node HTTP requests into Smithy requests and writes responses.
- Builds the per-request `ContestsContext` using `createRequestContext()`.

### `src/context.ts`

- Composition root for the contests service runtime context.
- Creates the singleton `PrismaContestsRepository` and per-request `ProblemsApiClient` / `UsersApiClient`.
- Forwards bearer tokens to downstream services when present.

### `src/application/ContestsApiServiceImpl.ts`

- Implements the generated Smithy service contract.
- Handles contest CRUD, enrollment, problem lookup, and leaderboard listing.
- Wraps every operation in `handleErrors()` to preserve known service errors and map unexpected persistence failures.

### `src/application/contests-repository.ts`

- Abstract repository interface.
- Declares application-level persistence operations used by the service layer.

### `src/persistence/prisma/contests-repository.ts`

- Prisma implementation of the repository interface.
- Owns database query logic for contests, enrollment, problem ordering, and leaderboard data.

### `src/application/contest-mapper.ts`

- Maps domain aggregates to Smithy server output types.

### `src/domain/`

- Domain interfaces (`ContestAggregate`, `CreateContestData`, etc.) and input validation helpers.

### `src/auth/principal.ts`

- Extracts the JWT bearer token and subject/scopes from incoming requests.

## Dependency Direction

- `src/index.ts` → `src/context.ts` → `src/application/ContestsApiServiceImpl.ts`
- `src/application/ContestsApiServiceImpl.ts` → `src/application/contests-repository.ts`
- `src/application/ContestsApiServiceImpl.ts` → `src/application/contest-mapper.ts`
- `src/context.ts` → `src/persistence/prisma/contests-repository.ts`

## Endpoints

| Method | Path                                   | Auth                   | Description                                                                  |
| ------ | -------------------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| GET    | `/v1/contests`                         | Optional               | List contests with optional status filter and pagination                     |
| GET    | `/v1/contests/{contestId}`             | Optional               | Get contest details; includes `isEnrolled` when authenticated                |
| POST   | `/v1/contests`                         | `contests:write`       | Create a contest with ordered problems                                       |
| PATCH  | `/v1/contests/{contestId}`             | `contests:write`       | Update contest metadata, schedule, status, or problem list                   |
| DELETE | `/v1/contests/{contestId}`             | `contests:write`       | Cancel a contest unless it is ongoing                                        |
| POST   | `/v1/contests/{contestId}/enroll`      | `contests:participate` | Enroll in a contest                                                          |
| DELETE | `/v1/contests/{contestId}/enroll`      | `contests:participate` | Unenroll from a contest                                                      |
| GET    | `/v1/contests/{contestId}/problems`    | Optional               | List contest problems (enriched with title/difficulty from problems-service) |
| GET    | `/v1/contests/{contestId}/leaderboard` | Optional               | Paginated leaderboard (enriched with usernames from users-service)           |

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```
PORT=3005
DATABASE_URL="postgresql://..."
PROBLEMS_URL="http://localhost:3001"
USERS_URL="http://localhost:3004"
```

## Running

```bash
# Development
pnpm dev

# Production build
pnpm build && pnpm start

# Database migration (requires running PostgreSQL)
pnpm exec prisma migrate dev --name init
```
