FROM node:22-alpine AS builder

WORKDIR /workspace

COPY abacusflow-apps/package.json abacusflow-apps/package-lock.json ./abacusflow-apps/
COPY abacusflow-apps/apps ./abacusflow-apps/apps
COPY abacusflow-apps/packages ./abacusflow-apps/packages

WORKDIR /workspace/abacusflow-apps

RUN npm ci --ignore-scripts
RUN npm exec --workspace=abacusflow-web -- next build

FROM nginx:1.27-alpine

ENV ABACUSFLOW_SERVER_HOST=abacusflow-server \
    ABACUSFLOW_SERVER_PORT=8080 \
    ABACUSFLOW_CUBE_HOST=cube \
    ABACUSFLOW_CUBE_PORT=4000

RUN rm -f /etc/nginx/conf.d/default.conf

COPY --from=builder /workspace/abacusflow-apps/apps/web/out /usr/share/nginx/html
COPY abacusflow-apps/apps/web/docker/nginx-templates/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
