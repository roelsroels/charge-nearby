FROM node:22-alpine

WORKDIR /app
COPY package.json server.mjs ./
COPY lib ./lib
COPY html ./html

ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

USER node
CMD ["node", "server.mjs"]
