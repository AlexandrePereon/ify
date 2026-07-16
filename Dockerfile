# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

# ----- Dependencies -----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Skip lifecycle scripts here: the postinstall is `nuxt prepare`, which needs
# the full source (not present yet). The build stage runs prepare itself.
RUN pnpm install --frozen-lockfile --ignore-scripts

# ----- Builder -----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NUXT_TELEMETRY_DISABLED=1
# No public env is baked at build time — Nuxt reads runtimeConfig (auth secret,
# Spotify credentials, public auth URL) from NUXT_* env vars when the Nitro
# server starts, so everything comes from compose at runtime.
RUN pnpm build

# ----- Runner -----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NUXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nitro

# The Nitro node-server output is fully self-contained (bundled deps included),
# so the runtime image needs nothing but .output.
COPY --from=builder --chown=nitro:nodejs /app/.output ./.output

USER nitro

# Nuxt HTTP server — also serves the SSE stream (/groups/:id/events) on the
# same port. There is no separate WebSocket server.
EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["node", ".output/server/index.mjs"]
