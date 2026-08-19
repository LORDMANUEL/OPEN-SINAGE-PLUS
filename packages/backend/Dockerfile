FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm audit fix --omit=dev \
    && npm audit --omit=dev --audit-level=high \
    && npm cache clean --force

COPY index.js ./index.js
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

USER node
CMD ["node", "index.js"]
