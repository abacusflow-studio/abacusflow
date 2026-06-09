FROM nginx:1.27-alpine

ENV ABACUSFLOW_SERVER_HOST=abacusflow-server \
    ABACUSFLOW_SERVER_PORT=8080 \
    ABACUSFLOW_CUBE_HOST=cube \
    ABACUSFLOW_CUBE_PORT=4000

RUN rm -f /etc/nginx/conf.d/default.conf

COPY apps/web/out /usr/share/nginx/html
COPY apps/web/docker/nginx-templates/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
