FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Instalar dependências (ignorar conflitos de peer deps durante build)
RUN npm ci --legacy-peer-deps

# Copiar código fonte
COPY src ./src

# Build
RUN npm run build

# Produção
FROM node:18-alpine

WORKDIR /app

# Copiar apenas necessário
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# polyfill para disponibilizar `crypto` globalmente (resolve ReferenceError)
RUN printf "globalThis.crypto = globalThis.crypto || require('crypto');\n" > /app/crypto-polyfill.js
ENV NODE_OPTIONS=--require=/app/crypto-polyfill.js

EXPOSE 3000

CMD ["node", "dist/main"]