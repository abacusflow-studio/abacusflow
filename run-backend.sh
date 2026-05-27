#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# 加载 .env
if [ -f ".env" ]; then
  echo "加载 .env 配置..."
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  echo "未找到 .env，继续使用当前环境变量..."
fi

# 可选：如果没有配置 profile，默认用 web
export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-web}"

echo "启动 AbacusFlow 后端服务..."
echo "当前 Spring profile: ${SPRING_PROFILES_ACTIVE}"

./gradlew :abacusflow-server:bootRun "$@"