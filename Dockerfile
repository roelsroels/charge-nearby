FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402

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
