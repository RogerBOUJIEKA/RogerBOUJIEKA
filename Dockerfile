# syntax=docker/dockerfile:1
# Images de production Klé : `docker build --target api|web|admin .`

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

FROM base AS build
# Les variables NEXT_PUBLIC_* sont figées dans le code du site au moment de la compilation.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_WHATSAPP_NUMBER=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm -r build
RUN pnpm --filter @kle/api deploy --legacy --prod /out/api \
  && cp -r apps/api/dist apps/api/drizzle /out/api/

FROM node:22-bookworm-slim AS api
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=build --chown=node:node /out/api ./
USER node
EXPOSE 3001
# Les migrations sont appliquées à chaque démarrage (une seule instance d'API).
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/main.js"]

FROM node:22-bookworm-slim AS web
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

FROM node:22-bookworm-slim AS admin
ENV NODE_ENV=production PORT=3002 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/admin/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build --chown=node:node /repo/apps/admin/public ./apps/admin/public
USER node
EXPOSE 3002
CMD ["node", "apps/admin/server.js"]
