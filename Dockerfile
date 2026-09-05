FROM node:22-alpine

WORKDIR /app
COPY package.json server.mjs ./
COPY lib ./lib
COPY html ./html

RUN mkdir -p /data && chown node:node /data

ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

VOLUME ["/data"]

USER node
CMD ["node", "server.mjs"]
