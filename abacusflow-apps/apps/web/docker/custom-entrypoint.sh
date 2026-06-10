#!/bin/sh
set -e

# 在容器启动时，将 Docker 传入的环境变量写成浏览器可读的 env-config.js
cat > /usr/share/nginx/html/env-config.js << EOF
window.__ENV__ = {
  "NEXT_PUBLIC_AUTH0_DOMAIN":       "${NEXT_PUBLIC_AUTH0_DOMAIN:-}",
  "NEXT_PUBLIC_AUTH0_CLIENT_ID":    "${NEXT_PUBLIC_AUTH0_CLIENT_ID:-}",
  "NEXT_PUBLIC_AUTH0_AUDIENCE":     "${NEXT_PUBLIC_AUTH0_AUDIENCE:-}",
  "NEXT_PUBLIC_AUTH0_REDIRECT_URI": "${NEXT_PUBLIC_AUTH0_REDIRECT_URI:-}",
  "NEXT_PUBLIC_API_BASE_URL":       "${NEXT_PUBLIC_API_BASE_URL:-/api}",
  "NEXT_PUBLIC_CUBE_ENDPOINT":      "${NEXT_PUBLIC_CUBE_ENDPOINT:-/cubejs-api}",
  "NEXT_PUBLIC_CUBE_TOKEN":         "${NEXT_PUBLIC_CUBE_TOKEN:-}"
};
EOF

# 将 env-config.js 注入到所有 HTML 文件的 <head> 最前面，确保比 Next.js bundle 先加载
find /usr/share/nginx/html -name "*.html" \
  | xargs sed -i 's|<head>|<head><script src="/env-config.js"></script>|g'

exec /docker-entrypoint.sh "$@"
