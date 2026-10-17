# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Усі залежності (з dev) — для збірки, міграцій і сидів.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Інструменти БД: compose запускає тут `db:migrate` і `db:seed`.
FROM deps AS tools
COPY . .

FROM tools AS builder
RUN npm run build

# Продакшн-образ: лише standalone-збірка Next.js.
FROM base AS runner
ENV NODE_ENV=production \
    PORT=5000 \
    HOSTNAME=0.0.0.0 \
    UPLOADS_DIR=/data/uploads

RUN addgroup -S -g 1001 nodejs \
 && adduser -S -u 1001 -G nodejs nextjs \
 && mkdir -p /data/uploads \
 && chown nextjs:nodejs /data/uploads

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health > /dev/null || exit 1

CMD ["node", "server.js"]
