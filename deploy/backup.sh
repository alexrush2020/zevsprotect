#!/usr/bin/env bash
# Бэкап БД (pg_dump -Fc, сжатый) и тома media с ротацией. Cron-пример — docs/DEPLOY.md.
#   BACKUP_DIR (по умолчанию /var/backups/zevs), KEEP_DAYS (по умолчанию 14)
set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
env_file="$here/.env.production"
dc() { docker compose --env-file "$env_file" -f "$here/docker-compose.prod.yml" "$@"; }

backup_dir=${BACKUP_DIR:-/var/backups/zevs}
keep_days=${KEEP_DAYS:-14}
ts=$(date +%Y%m%d-%H%M%S)

umask 077 # файлы бэкапа — 600, каталог — 700
if ! mkdir -p "$backup_dir" 2>/dev/null || [[ ! -w $backup_dir ]]; then
  echo "каталог бэкапов $backup_dir недоступен для записи: sudo install -d -o \"\$USER\" -m 700 $backup_dir (или задайте BACKUP_DIR)" >&2
  exit 1
fi

db_file="$backup_dir/db-$ts.dump"
# внутри контейнера: локальный сокет, пароль не нужен и не светится в аргументах
# shellcheck disable=SC2016 # переменные раскрывает sh внутри контейнера
dc exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' >"$db_file.part"
# архив читается — иначе не считаем бэкап состоявшимся
dc exec -T postgres pg_restore -l <"$db_file.part" >/dev/null
mv "$db_file.part" "$db_file"
echo "БД: $db_file ($(du -h "$db_file" | cut -f1))"

# том media (имя: <project name из compose>_media)
if docker volume inspect zevs_media >/dev/null 2>&1; then
  media_file="$backup_dir/media-$ts.tar.gz"
  docker run --rm -v zevs_media:/data:ro postgres:16-alpine tar czf - -C /data . >"$media_file.part"
  mv "$media_file.part" "$media_file"
  echo "media: $media_file ($(du -h "$media_file" | cut -f1))"
fi

find "$backup_dir" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'media-*.tar.gz' \) -mtime +"$keep_days" -delete
find "$backup_dir" -maxdepth 1 -type f -name '*.part' -mmin +60 -delete
