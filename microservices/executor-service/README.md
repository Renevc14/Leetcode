# Executor Service

This service implements the internal code execution microservice for the platform. It receives execution requests via the generated `@leetcode/executor-server-sdk`, runs user code inside an isolated Docker container, and returns verdicts for compiled and executed test cases.

## Overview

- Runs language-specific execution strategies inside Docker containers.
- Supports health checks on `/healthz`.
- Limits concurrent container execution with a semaphore.
- Uses Dockerode to create containers and execute compile/run commands.

## Configuration

The service is configured via environment variables.

Optional:

- `PORT` - HTTP port (default: `3005`).
- `EXEC_IMAGE_PYTHON` - Docker image for Python execution.
- `EXEC_IMAGE_NODE` - Docker image for JavaScript/TypeScript execution.
- `EXEC_IMAGE_JAVA` - Docker image for Java execution.
- `EXEC_IMAGE_CPP` - Docker image for C++ execution.
- `MAX_CONCURRENT_CONTAINERS` - max concurrent containers (default: `4`).
- `CONTAINER_CPU` - CPU quota for each container (default: `1.0`).

## Architecture

### `src/index.ts`

- Creates the HTTP server.
- Exposes `/healthz` without auth.
- Converts incoming requests and delegates to the Smithy-generated executor handler.

### `src/context.ts`

- Builds the request context containing the shared `Semaphore` instance.
- Ensures concurrent container execution is limited across requests.

### `src/application/ExecutorApiServiceImpl.ts`

- Implements the Smithy-generated `ExecutorApiService` interface.
- Handles the `Execute` operation.
- Uses language strategy metadata to compile and run code.
- Aggregates per-test-case verdicts into the response.

### `src/infrastructure/docker/container-runner.ts`

- Creates and manages Docker containers using Dockerode.
- Writes source code into the container filesystem.
- Executes compile and runtime commands.
- Captures stdout, stderr, exit codes, wall time, timeouts, and OOM kills.
- Cleans up containers after each request.

## Execution flow

1. Request arrives at `src/index.ts`.
2. Shared secret is validated.
3. Request is converted and passed to the Smithy handler.
4. `ExecutorApiServiceImpl.Execute()` receives the input and request context.
5. ContainerRunner starts a container and writes the source file.
6. If the language requires compilation, compile output is checked.
7. Each test case is executed sequentially.
8. The service returns a verdict and per-test-case results.

## API Endpoint

### Execute

- Method: `POST`
- Path: `/v1/execute`
- Header: none required
- Body: JSON payload matching `ExecuteServerInput` from `@leetcode/executor-server-sdk`

Example:

```bash
curl -X POST http://localhost:3005/v1/execute \
  -H "Content-Type: application/json" \
  -H "x-executor-secret: ${EXECUTOR_SHARED_SECRET}" \
  -d '{
    "language": "PYTHON",
    "code": "print(input())",
    "limits": { "timeLimitMs": 2000, "memoryLimitMb": 256 },
    "testCases": [
      { "testCaseId": "tc-1", "input": "hello", "expectedOutput": "hello" }
    ]
  }'
```

Example response:

```json
{
  "status": "ACCEPTED",
  "timeMs": 123,
  "memoryMb": 0,
  "errorMessage": null,
  "testCaseResults": [
    {
      "testCaseId": "tc-1",
      "status": "ACCEPTED",
      "executionTimeMs": 123,
      "memoryUsageMb": null,
      "actualOutput": "hello"
    }
  ]
}
```

## Running locally

Install dependencies and build the service:

```bash
pnpm install
pnpm --filter @leetcode/executor-service build
```

Start in development mode:

```bash
cd microservices/executor-service
pnpm dev
```

Start production mode after building:

```bash
cd microservices/executor-service
pnpm start
```

## Notes

- The service uses Docker and requires Docker daemon access.
- The executor service is intended for internal use only and should remain protected by the shared secret.
