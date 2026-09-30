#!/usr/bin/env bash
# Выкатка текущего checkout: БД → бэкап → миграции → сборка → запуск → smoke. Подробно — docs/DEPLOY.md.
# Запуск на сервере: deploy/deploy.sh
set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
env_file="$here/.env.production"
[[ -f $env_file ]] || { echo "нет $env_file (шаблон: deploy/env.production.example)" >&2; exit 1; }
files=(-f "$here/docker-compose.prod.yml")
# DEPLOY_PROXY=traefik: вход снаружи — внешний Traefik по меткам app (docker-compose.traefik.yml), caddy не запускается
traefik=''
grep -qx 'DEPLOY_PROXY=traefik' "$env_file" && { traefik=1; files+=(-f "$here/docker-compose.traefik.yml"); }
dc() { docker compose --env-file "$env_file" "${files[@]}" "$@"; }
initialized() { curl -fsS http://127.0.0.1:3000/api/users/init 2>/dev/null | grep -q '"initialized":true'; }
# пока первого администратора нет (первый запуск), метки Traefik выключены: /admin снаружи закрыт
initialized || export TRAEFIK_ENABLE=false

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

# вход снаружи (caddy или метки Traefik) — только когда первый администратор уже создан: иначе /admin предложит его создать любому
if ! initialized; then
  echo "== пользователей нет: создайте администратора (deploy/create-admin.sh) и запустите deploy.sh ещё раз" >&2
  exit 1
fi

if [[ -n $traefik ]]; then
  echo "== app за Traefik"
  # no-op, если метки уже включены; после первого администратора — пересоздаёт app с traefik.enable=true
  unset TRAEFIK_ENABLE
  dc up -d --wait app
else
  echo "== запуск caddy"
  dc up -d caddy
fi
dc ps
