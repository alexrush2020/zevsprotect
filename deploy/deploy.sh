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

# :prev — образ ЗАПУЩЕННОГО app, а не :latest: повтор deploy.sh после сбоя сборки не затрёт рабочую версию
running=$(dc ps -q app)
if [[ -n $running ]]; then
  docker image tag "$(docker inspect --format '{{.Image}}' "$running")" zevs-app:prev
  echo "== откат доступен: zevs-app:prev"
fi

echo "== миграции Payload (до сборки: next build читает БД уже новой схемы)"
dc build migrate
dc run --rm migrate

echo "== сборка приложения"
dc build app

echo "== запуск app"
dc up -d --wait app
curl -fsS http://127.0.0.1:3000/api/health
echo

# caddy (вход снаружи) — только когда первый администратор уже создан: иначе /admin предложит его создать любому
if ! curl -fsS http://127.0.0.1:3000/api/users/init | grep -q '"initialized":true'; then
  echo "== пользователей нет: создайте администратора (deploy/create-admin.sh) и запустите deploy.sh ещё раз" >&2
  exit 1
fi

echo "== запуск caddy"
dc up -d caddy
dc ps
