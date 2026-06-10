ARG CUBE_VERSION=v1.3
FROM cubejs/cube:${CUBE_VERSION}

ENV CUBEJS_DEV_MODE=true \
    CUBEJS_CUBESTORE_HOST=cubestore \
    CUBEJS_CUBESTORE_PORT=3030 \
    CUBEJS_API_SECRET="" \
    CUBEJS_JWT_JWK_URL="" \
    CUBEJS_JWT_AUDIENCE="" \
    CUBEJS_JWT_ISSUER=""

COPY cube.js /cube/conf/cube.js
COPY model /cube/conf/model
