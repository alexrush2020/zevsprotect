#!/usr/bin/env bash
# Выкатка текущего checkout: БД → бэкап → миграции → сборка → запуск → smoke. Подробно — docs/DEPLOY.md.
# Запуск на сервере: deploy/deploy.sh
set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
env_file="$here/.env.production"
[[ -f $env_file ]] || { echo "нет $env_file (шаблон: deploy/env.production.example)" >&2; exit 1; }
dc() { docker compose --env-file "$env_file" -f "$here/docker-compose.prod.yml" "$@"; }

echo "== postgres"
dc up -d --wait postgres

echo "== бэкап перед миграциями"
"$here/backup.sh"

echo "== образы текущей версии → :prev (для отката)"
for img in zevs-app zevs-migrate; do
  if docker image inspect "$img:latest" >/dev/null 2>&1; then
    docker image tag "$img:latest" "$img:prev"
  fi
done

echo "== миграции Payload (до сборки: next build читает БД уже новой схемы)"
dc build migrate
dc run --rm migrate

echo "== сборка приложения"
dc build app

echo "== запуск"
dc up -d --wait app caddy

echo "== smoke"
curl -fsS http://127.0.0.1:3000/api/health
echo
dc ps
