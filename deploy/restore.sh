#!/usr/bin/env bash
# Восстановление из бэкапов deploy/backup.sh.
#   restore.sh check <db-*.dump>   — проверочное восстановление в отдельную БД zevs_restore_check (прод не трогает)
#   restore.sh db    <db-*.dump>   — ЗАМЕНА боевой БД (деструктивно, с подтверждением; app останавливается)
#   restore.sh media <media-*.tar.gz> — ЗАМЕНА содержимого тома media (деструктивно, с подтверждением)
# shellcheck disable=SC2016 # $POSTGRES_* в sh -c раскрывает sh внутри контейнера
set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
env_file="$here/.env.production"
dc() { docker compose --env-file "$env_file" -f "$here/docker-compose.prod.yml" "$@"; }

usage() { sed -n '2,5p' "${BASH_SOURCE[0]}" >&2; exit 2; }
[[ $# -eq 2 ]] || usage
mode=$1 file=$2
[[ -f $file ]] || { echo "нет файла $file" >&2; exit 1; }

confirm() {
  local answer
  read -r -p "$1 Введите «да» для продолжения: " answer
  [[ $answer == "да" ]] || { echo "отменено" >&2; exit 1; }
}

# $1 — имя БД; SQL и pg_restore выполняются внутри контейнера postgres от POSTGRES_USER по сокету
recreate_db() { dc exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" --if-exists --force "$1" && createdb -U "$POSTGRES_USER" "$1"' _ "$1"; }
restore_into() { dc exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$1" --no-owner --exit-on-error' _ "$1" <"$file"; }

case $mode in
  check)
    db=zevs_restore_check
    recreate_db "$db"
    restore_into "$db"
    dc exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$1" -At -v ON_ERROR_STOP=1' _ "$db" <<'SQL'
select 'таблиц: ' || count(*) from information_schema.tables where table_schema = 'public';
select 'миграций: ' || count(*) from payload_migrations;
select 'товаров: ' || count(*) from products;
select 'заказов: ' || count(*) from orders;
SQL
    dc exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" "$1"' _ "$db"
    echo "проверочное восстановление прошло, $db удалена"
    ;;
  db)
    confirm "Боевая БД будет ЗАМЕНЕНА содержимым $file. Сделан ли свежий бэкап (deploy/backup.sh)?"
    dc stop app
    dc exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" --force "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
    dc exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --exit-on-error' <"$file"
    dc up -d --wait app
    echo "БД восстановлена из $file"
    ;;
  media)
    confirm "Содержимое тома media будет ЗАМЕНЕНО архивом $file."
    dc stop app
    docker run --rm -i -v zevs_media:/data postgres:16-alpine \
      sh -c 'find /data -mindepth 1 -delete && tar xzf - -C /data && chown -R 1000:1000 /data' <"$file"
    dc up -d --wait app
    echo "media восстановлен из $file"
    ;;
  *) usage ;;
esac
