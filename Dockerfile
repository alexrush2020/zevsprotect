# syntax=docker/dockerfile:1
# Прод-образ зевспротект® (Next.js standalone + Payload). Сборка и запуск — deploy/deploy.sh, описание — docs/DEPLOY.md.
# Цели: migrator — полный исходник для `payload migrate` (запускается до приложения);
#       runner  — минимальный образ приложения (server.js из output: 'standalone').
# `next build` пререндерит страницы из БД (layout читает каталог через Local API), поэтому стадия builder
# ходит в уже смигрированную БД: переменные — из BuildKit-секрета app_env (не попадают в слои образа),
# сеть — host (см. build.network в deploy/docker-compose.prod.yml).

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Исходник + все зависимости: payload CLI грузит payload.config.ts и migrations/*.ts
FROM deps AS source
COPY . .

FROM source AS migrator
ENV NODE_ENV=production
USER node
# tsx кладёт кэш в os.tmpdir() — права на /app не нужны
CMD ["node_modules/.bin/payload", "migrate"]

FROM source AS builder
ENV NODE_ENV=production
# вшивается в клиентский бандл; ARG входит в ключ кэша BuildKit (секрет — нет), смена URL пересобирает слой
ARG NEXT_PUBLIC_SERVER_URL
RUN --mount=type=secret,id=app_env,required=true \
    test -n "$NEXT_PUBLIC_SERVER_URL" && url="$NEXT_PUBLIC_SERVER_URL" \
    && set -a && . /run/secrets/app_env && set +a \
    && NEXT_PUBLIC_SERVER_URL="$url" npx next build --webpack

FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MEDIA_DIR=/data/media \
    ONEC_EXCHANGE_DIR=/data/1c-exchange
# каталоги томов создаются заранее с владельцем node: пустой именованный том наследует права
RUN mkdir -p /data/media /data/1c-exchange && chown -R node:node /data
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "server.js"]
