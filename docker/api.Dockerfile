# syntax=docker/dockerfile:1.7
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @serag/api exec prisma generate \
 && pnpm turbo run build --filter=@serag/api... \
 && pnpm --filter @serag/api deploy --prod --legacy /out \
 && cp -r apps/api/prisma apps/api/prisma.config.ts /out/

FROM node:24-slim AS run
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
