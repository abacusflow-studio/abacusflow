#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

# 启动依赖服务 (PostgreSQL)
echo "启动 PostgreSQL..."
docker compose -f docker-compose-base.yml up -d postgres

# 等待 PostgreSQL 就绪
echo "等待 PostgreSQL 就绪..."
until docker exec postgres pg_isready >/dev/null 2>&1; do
    sleep 1
done
echo "PostgreSQL 已就绪"

# 启动后端
echo "启动 AbacusFlow 后端服务..."
./gradlew :abacusflow-server:bootRun "$@"
