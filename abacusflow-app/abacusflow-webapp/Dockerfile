FROM nginx:alpine

LABEL org.opencontainers.image.description="这是一个用于构建 AbacusFlow Webapp 的镜像"

# 默认不开启容器内部 HTTPS
ENV ENABLE_HTTPS=false
ENV ABACUSFLOW_WEBAPP=_

# 删除 nginx 官方默认站点，避免它抢占请求
RUN rm -f /etc/nginx/conf.d/default.conf


# 复制构建好的前端代码到 Nginx 静态目录
COPY dist /usr/share/nginx/html

# 永远启用的模板：交给官方 nginx entrypoint 自动处理

## 公共 SPA 片段
COPY docker/nginx-templates/common_spa.inc.template /etc/nginx/templates/common_spa.inc.template
### HTTP 主配置
COPY docker/nginx-templates/default.http.conf.template /etc/nginx/templates/default.http.conf.template

# 可选的模板：不要直接放到 /etc/nginx/templates，避免被自动处理

## # HTTPS 主配置
COPY docker/nginx-templates/default.https.conf.template /etc/nginx/optional-templates/default.https.conf.template

# 自定义启动脚本
COPY docker/custom-entrypoint.sh /custom-entrypoint.sh
RUN chmod +x /custom-entrypoint.sh

ENTRYPOINT ["/custom-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]