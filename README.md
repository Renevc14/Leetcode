# Leetcode

Sistema de autenticación y autorización para una plataforma tipo LeetCode. Usa OIDC con Authorization Code + PKCE para AuthN y RBAC con tres roles (USER, SETTER, ADMIN) para AuthZ.

## Estructura del monorepo

- `infra/` — Infraestructura como código con AWS CDK en TypeScript.
- `frontend/` — SPA en React 18 + Vite.
- `scripts/` — Utilidades operativas (por ejemplo, bootstrap de Authentik).
- `docs/` — Documentación técnica y procedimientos.

## Stack

- **AWS:** CDK, ECS Fargate, RDS PostgreSQL, API Gateway HTTP API con JWT Authorizer, Secrets Manager.
- **Frontend:** React 18 + TypeScript + Vite, `react-oidc-context`.
- **Identity Provider:** Authentik (self-hosted en ECS Fargate).
- **Tests E2E:** Playwright.

## Setup

Cada feature documenta sus pasos en `docs/`. La configuración base se completa al cerrar la feature de infraestructura.
