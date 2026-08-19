FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache ffmpeg ca-certificates

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm audit fix --omit=dev \
    && npm audit --omit=dev --audit-level=high \
    && npm cache clean --force

COPY index.js ./index.js
COPY src ./src

RUN mkdir -p /data/transcode && chown -R node:node /data /app

ENV NODE_ENV=production
EXPOSE 3000

USER node
CMD ["node", "index.js"]
