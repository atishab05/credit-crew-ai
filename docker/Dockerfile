# syntax=docker/dockerfile:1.7
# Multi-stage build for CreditCrew AI (TanStack Start + Nitro).

FROM oven/bun:1.1-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb* bunfig.toml* ./
RUN bun install --frozen-lockfile || bun install

FROM deps AS build
COPY . .
ENV NODE_ENV=production
RUN bun run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Nitro node-server preset outputs to .output/
COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", ".output/server/index.mjs"]
