# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build \
  && test -f .next/standalone/server.js \
  || (echo "ERROR: .next/standalone/server.js manquant — vérifier output: 'standalone' dans next.config" && exit 1)

# Runtime stage — image minimale via output standalone
FROM node:20-alpine AS runner

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Garde-fou : l’image runtime doit contenir le serveur Next standalone
RUN test -f server.js \
  || (echo "ERROR: server.js absent dans l’image runtime" && exit 1)

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
