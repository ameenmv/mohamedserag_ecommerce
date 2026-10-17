# syntax=docker/dockerfile:1.7
FROM node:24-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @serag/api exec prisma generate \
 && pnpm turbo run build --filter=@serag/api... \
 && pnpm --filter @serag/api deploy --prod --legacy /out \
 && cp -r apps/api/dist /out/dist \
 && cp -r apps/api/prisma apps/api/prisma.config.ts /out/

# Dedicated one-shot migration stage retaining devDependencies and Prisma CLI
FROM build AS migrate
WORKDIR /repo/apps/api
RUN mkdir -p /uploads && chown node:node /uploads
USER node
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

# Production runtime image: minimal, non-root, with compiled NestJS dist
FROM node:24-slim AS run
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
RUN mkdir -p /uploads && chown node:node /uploads
COPY --from=build --chown=node:node /out .
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/main.js"]
