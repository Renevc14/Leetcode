#!/usr/bin/env bash
# Build all language runner images used by executor-service.
# Run once from the repo root or from this directory before starting the service.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[executor] Building language runner images..."

docker build -f "$SCRIPT_DIR/python.Dockerfile" -t leetcode-exec-python:latest "$SCRIPT_DIR"
echo "[executor] ✓ leetcode-exec-python"

docker build -f "$SCRIPT_DIR/node.Dockerfile" -t leetcode-exec-node:latest "$SCRIPT_DIR"
echo "[executor] ✓ leetcode-exec-node"

docker build -f "$SCRIPT_DIR/java.Dockerfile" -t leetcode-exec-java:latest "$SCRIPT_DIR"
echo "[executor] ✓ leetcode-exec-java"

docker build -f "$SCRIPT_DIR/cpp.Dockerfile" -t leetcode-exec-cpp:latest "$SCRIPT_DIR"
echo "[executor] ✓ leetcode-exec-cpp"

echo "[executor] All images built successfully."
