# Dockerfile específico del executor-service.
#
# Diferencias respecto al Dockerfile genérico:
#   1. Necesita el cliente Docker en runtime (dockerode habla con /var/run/docker.sock).
#   2. NO se despliega en ECS Fargate (no expone el socket). Va en una EC2 dedicada
#      con docker-compose o ECS EC2 launch type.
#
# Build (desde la raíz del repo):
#   docker build -f microservices/executor-service/Dockerfile -t leetcode/executor-service:local .

ARG NODE_VERSION=22-alpine

# ─── Stage 1 · Build ──────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS builder

RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.json eslint.config.mts ./
COPY smithy/package.json ./smithy/
COPY frontend/package.json ./frontend/
COPY microservices/contests-service/package.json ./microservices/contests-service/
COPY microservices/problems-service/package.json ./microservices/problems-service/
COPY microservices/submissions-service/package.json ./microservices/submissions-service/
COPY microservices/users-service/package.json ./microservices/users-service/
COPY microservices/executor-service/package.json ./microservices/executor-service/

# SDKs precompilados localmente (smithy build + tsc).
COPY packages ./packages

RUN pnpm install --frozen-lockfile

COPY smithy ./smithy
COPY microservices ./microservices

RUN pnpm --filter @leetcode/executor-service run build

RUN pnpm --filter @leetcode/executor-service deploy --prod --legacy /deploy

# ─── Stage 2 · Runtime ────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runtime

# Cliente Docker para hablar con el socket del host (sandbox containers)
RUN apk add --no-cache docker-cli

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

COPY --from=builder /deploy/dist ./dist
COPY --from=builder /deploy/node_modules ./node_modules
COPY --from=builder /deploy/package.json ./package.json

# Copia los Dockerfiles de las imágenes de runners (cpp, java, node, python)
# para que el operador pueda buildearlas con el build.sh incluido.
COPY --from=builder /repo/microservices/executor-service/docker ./docker

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

CMD ["node", "dist/src/index.js"]
