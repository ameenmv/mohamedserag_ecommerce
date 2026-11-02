# syntax=docker/dockerfile:1.7
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
# nuxt.config bakes the image-optimiser (IPX) source dir at build time: it must be the uploads
# volume's path in the runtime image, or every /_ipx/... request for an upload is a 404
ENV UPLOADS_DIR=/uploads
RUN pnpm turbo run build --filter=@serag/web...

# Production runtime image: minimal, non-root, with Nuxt .output only
FROM node:24-slim AS run
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
RUN mkdir -p /uploads && chown node:node /uploads
COPY --from=build --chown=node:node /repo/apps/web/.output .
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server/index.mjs"]
