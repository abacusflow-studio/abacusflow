ARG CUBE_VERSION=v1.3
FROM cubejs/cube:${CUBE_VERSION}

ENV CUBEJS_CUBESTORE_HOST=cubestore \
    CUBEJS_CUBESTORE_PORT=3030

COPY cube.js /cube/conf/cube.js
COPY model /cube/conf/model
