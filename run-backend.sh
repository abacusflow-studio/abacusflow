#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

# 启动后端
echo "启动 AbacusFlow 后端服务..."
./gradlew :abacusflow-server:bootRun "$@"
