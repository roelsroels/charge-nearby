FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4

WORKDIR /app
COPY package.json server.mjs ./
COPY lib ./lib
COPY html ./html

# The dependency-free runtime only needs Node.js; omit npm and its bundled packages.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

RUN mkdir -p /data && chown node:node /data

ENV HOST=0.0.0.0
ENV PORT=8080
ENV STATION_HISTORY_FILE=/data/stations.json
ENV STATION_HISTORY_TTL_MS=2592000000
EXPOSE 8080

VOLUME ["/data"]

USER node
CMD ["node", "server.mjs"]
