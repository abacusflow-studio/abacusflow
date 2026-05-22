#!/bin/sh
set -e

# 默认值
export ENABLE_HTTPS="${ENABLE_HTTPS:-false}"
export ABACUSFLOW_WEBAPP="${ABACUSFLOW_WEBAPP:-_}"

echo "ENABLE_HTTPS=${ENABLE_HTTPS}"
echo "ABACUSFLOW_WEBAPP=${ABACUSFLOW_WEBAPP}"

# 删除 nginx 官方默认配置，避免 server: localhost 抢占请求
rm -f /etc/nginx/conf.d/default.conf

# 防止上一次启动残留 HTTPS 模板或配置
rm -f /etc/nginx/templates/default.https.conf.template
rm -f /etc/nginx/conf.d/default.https.conf

if [ "$ENABLE_HTTPS" = "true" ]; then
  echo "ENABLE_HTTPS=true, enabling HTTPS config..."

  if [ ! -f "/etc/nginx/ssl/fullchain.pem" ] || [ ! -f "/etc/nginx/ssl/privkey.pem" ]; then
    echo "ERROR: ENABLE_HTTPS=true, but SSL certificate files are missing." >&2
    echo "Expected:" >&2
    echo "  /etc/nginx/ssl/fullchain.pem" >&2
    echo "  /etc/nginx/ssl/privkey.pem" >&2
    exit 1
  fi

  cp /etc/nginx/optional-templates/default.https.conf.template \
     /etc/nginx/templates/default.https.conf.template
else
  echo "ENABLE_HTTPS=false, HTTPS config will not be generated."
fi

# 交给官方 nginx entrypoint：
# 它会自动处理 /etc/nginx/templates/*.template
exec /docker-entrypoint.sh "$@"