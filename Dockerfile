# ─────────────────────────────────────────────────────────────
# Ykay College EduPortal — Production Docker Image
# Multi-stage build for minimal production image size
# ─────────────────────────────────────────────────────────────

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production && \
    cp -R node_modules /app/prod_modules && \
    npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Precompile the idempotent seeds to plain ESM so the slim runtime image can
# run them without tsx (boot seeding — see docker-entrypoint.sh)
RUN npx esbuild prisma/cbt-seed.ts --bundle --platform=node --format=esm \
      --external:@prisma/client --external:bcryptjs --outfile=/out-seeds/cbt-seed.mjs \
 && npx esbuild prisma/seed-super-admin.ts --bundle --platform=node --format=esm \
      --external:@prisma/client --external:bcryptjs --outfile=/out-seeds/seed-super-admin.mjs

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Prisma CLI (schema migrate deploy at boot) + precompiled seeds
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /out-seeds ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/bin/sh", "docker-entrypoint.sh"]
