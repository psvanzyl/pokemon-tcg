# ---- deps & build -------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The catalogue snapshot is baked in as the fallback copy. At runtime the
# Coolify volume at /app/data takes precedence (see src/lib/data.ts), so a daily
# price refresh does not need a rebuild.
RUN test -f public/data/cards.json.gz && echo "snapshot present"

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runtime ------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# /app/data is the mount point for the daily-refreshed catalogue.
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
