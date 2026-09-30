# Выкатка на продакшен (VPS в РФ)

Артефакты: [`Dockerfile`](../Dockerfile), [`deploy/`](../deploy) (compose, Caddyfile, скрипты, шаблон переменных).
Деплой и любые действия на сервере — только по прямому поручению владельца (AGENTS §3). Решение — ARCHITECTURE, Решение 3.

```
Интернет ─ 80/443 ─ caddy (TLS Let's Encrypt, gzip/zstd, X-Real-IP) ─ app:3000 (Next standalone + Payload, jobs autoRun)
                                                                          │
                                         postgres:16 (том pgdata) ────────┘   тома media, onec (файлы обмена 1С)
```

## 1. Сервер

- **Размещение в РФ** — обязательно: сайт хранит ПДн клиентов (заказы, заявки, ЛК), 152-ФЗ требует хранения в РФ (CONTRA-4). Выбор хостинга и оплата — заказчик, решение открыто (**BIZ-3**). Бэкапы — тоже в РФ.
- Google Analytics передаёт данные за рубеж — поле «ID Google Analytics» в «Настройки → Счётчики» оставить пустым до решения по CONTRA-4, использовать Яндекс.Метрику.
- Минимум: 2 vCPU, 4 ГБ RAM (сборка `next build` на сервере; при 2 ГБ — добавить swap 2–4 ГБ), 40 ГБ SSD + рост медиа; Ubuntu 24.04 / Debian 12.
- Docker Engine **≥ 28** и плагин Compose ≥ 2.24 (`docker compose version`); `curl`, `git`. До Docker 28 порты, опубликованные на `127.0.0.1`, были доступны соседям по L2-сегменту хостинга (route_localnet); если версия старше невозможна — правило в цепочке `DOCKER-USER`, запрещающее входящие на 5432 и 3000 со всех интерфейсов, кроме `lo`.
- Docker со штатным управлением iptables (в `/etc/docker/daemon.json` **не** `"iptables": false`): иначе трафик идёт через userland-proxy и Caddy видит вместо клиента IP шлюза Docker — rate limit станет общим на всех (ARCHITECTURE, Решение 6).
- **IPv6: без AAAA-записи домена** (или включить IPv6 в сети compose — `enable_ipv6` — и проверить по §11). Без IPv6 в сети Docker подключения по IPv6 проксируются с подменой адреса — та же проблема с IP клиента.
- Порты наружу: 22, 80, 443 (tcp и udp). Postgres (5432) и app (3000) слушают только `127.0.0.1` хоста.
- **Порт 5432 на loopback хоста должен быть свободен** (сборка ходит в БД через него, см. §3). Системный PostgreSQL на сервере не ставить.
- Доступ сервера наружу: npm-реестр и Google Fonts (`next/font` скачивает шрифты при сборке; без доступа сборка упадёт), Let's Encrypt, SMTP, портал Б24.

## 2. Файлы на сервере

```bash
sudo mkdir -p /opt/zevs && sudo chown "$USER" /opt/zevs
git clone <репозиторий> /opt/zevs && cd /opt/zevs
cp deploy/env.production.example deploy/.env.production
chmod 600 deploy/.env.production
nano deploy/.env.production
# каталог бэкапов и лог cron — от пользователя, который запускает deploy.sh/backup.sh (он в группе docker)
sudo install -d -o "$USER" -m 700 /var/backups/zevs
sudo install -o "$USER" -m 600 /dev/null /var/log/zevs-backup.log
```

`deploy/.env.production` в git не попадает (`.gitignore: .env*`), в образ — тоже (`.dockerignore`). Для ручных команд:

```bash
alias dc='docker compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml'
```

## 3. Решение: сборка с доступом к БД

`next build` пререндерит страницы из БД: корневой layout читает каталог через Local API (`getClientCatalog`), страницы каталога, блога и контента — тоже (`lib/server/catalog.ts`, ISR 5 мин + сброс по тегам). Без БД сборка падает. Переводить страницы в `force-dynamic` ради сборки не стали: это меняет кэширование витрины (каждый запрос в БД) и требует правок во многих страницах.

Поэтому:
- стадия `builder` в Dockerfile получает переменные из **BuildKit-секрета** `app_env` (= `deploy/.env.production`) — они не попадают в слои образа;
- сборка идёт в **сети хоста** (`build.network: host`), имя `postgres` указывает на `127.0.0.1` (`extra_hosts`), postgres опубликован на `127.0.0.1:5432`;
- **миграции накатываются до сборки** (стадия `migrator`, отдельный образ) — сборка читает БД уже новой схемы. Во время сборки jobs не запускаются (Payload проверяет фазу `next build`), в БД сборка не пишет.
- `NEXT_PUBLIC_SERVER_URL` вшивается в клиентский бандл, поэтому передаётся ещё и как build arg (`build.args`): секрет не входит в ключ кэша BuildKit, а arg входит — смена URL пересобирает слой. После смены — `deploy/deploy.sh`; при сомнении в кэше — `dc build --no-cache app` и снова `deploy/deploy.sh`.
- Сборка — `next build --webpack` (так проект проверялся на всех этапах).

Порядок выкатки поэтому фиксированный и собран в [`deploy/deploy.sh`](../deploy/deploy.sh): postgres → бэкап → образ запущенного app в `zevs-app:prev` → `build migrate` → `run migrate` → `build app` → `up app` → `/api/health` → проверка, что первый администратор создан → `up caddy`.

## 4. Перед первым запуском (чек-лист)

- [ ] DNS: A-записи `zevsprotect.ru` и `www.zevsprotect.ru` → IP сервера (переключать, когда всё ниже готово; до этого сайт по IP не открывается — Caddy отвечает только на домен).
- [ ] `deploy/.env.production` заполнен: `SITE_DOMAIN`, `ACME_EMAIL`, `POSTGRES_PASSWORD` и тот же пароль в `DATABASE_URL`, `NEXT_PUBLIC_SERVER_URL=https://<домен>`.
- [ ] `PAYLOAD_SECRET` — `openssl rand -hex 32`, **не менять после запуска** (сбросятся сессии и токены). Значения — без кавычек, пробелов и `$` (файл читают и compose, и `sh`).
- [ ] SMTP (`SMTP_*`): без `SMTP_HOST` письма клиентам (регистрация, сброс пароля, заказ) не уходят, только в лог. `LEADS_EMAIL` или email в «Настройки → Контакты».
- [ ] Б24 (`B24_*`) и 1С (`ONEC_*`) — боевые значения даёт заказчик; пустые — интеграция выключена (Б24: ошибка синхронизации у документов, 1С: обмен отвечает 503).
- [ ] Вход через Яндекс ID (`YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`; пустые — кнопка остаётся заглушкой, `/api/auth/yandex/*` → 404). `NEXT_PUBLIC_SERVER_URL` — **единственный канонический хост** (`www → основной` уже делает Caddy): `/api/auth/yandex/start` с другого хоста сначала уводит на него, иначе cookie state и redirect_uri разойдутся. В кабинете oauth.yandex.ru Callback URI — ровно `https://<домен>/api/auth/yandex/callback`, доступы `login:email`, `login:info`.
- [ ] Миграции: делает `deploy.sh`. На проде **никогда** не полагаться на `push` схемы (он только в dev).
- [ ] **Сид (`npm run seed`) на проде не запускать**: он заливает мок-каталог прототипа. Каталог приходит из 1С (обмен), контент глобалов при пустых полях показывает тексты по умолчанию. Перенос статей/медиа со старого сайта — отдельная задача с бэкапом до и после.
- [ ] **Первый администратор — до входа снаружи.** Пока в БД нет пользователей, `/admin` предлагает любому создать первого, и он получает роль «Администратор». Поэтому первый `deploy/deploy.sh` поднимает app, но **не запускает caddy**, пока пользователей нет, и останавливается с подсказкой. Дальше:
  1. `deploy/create-admin.sh` — спрашивает email и пароль (не через аргументы), создаёт админа по loopback (`POST http://127.0.0.1:3000/api/users/first-register` изнутри контейнера app) и проверяет `/api/users/init` → `{"initialized":true}`;
  2. повторить `deploy/deploy.sh` — теперь запустится caddy;
  3. только после этого переключать DNS.

  Остальных сотрудников заводит администратор («Система → Пользователи»), роли — §1 [ADMIN-GUIDE](ADMIN-GUIDE.md). Дополнительно можно закрыть `/admin` паролем Caddy (закомментированный `basic_auth` в Caddyfile).
- [ ] После первого входа: «Настройки» — контакты, реквизиты для счёта, стадии Б24 → статус заказа; «Меню».
- [ ] В 1С — узел «Обмен с сайтом»: адрес `https://<домен>/api/1c-exchange`, логин/пароль из `ONEC_EXCHANGE_*`.
- [ ] В Б24 — исходящий вебхук `ONCRMDEALUPDATE` на `https://<домен>/api/b24/webhook`, его `application_token` → `B24_WEBHOOK_TOKEN`.
- [ ] Cron бэкапов (§7) и проверочное восстановление.

## 5. Выкатка и обновление

```bash
cd /opt/zevs
git fetch && git checkout <тег или коммит релиза>
deploy/deploy.sh
```

Первый запуск — та же команда, но она остановится перед caddy до создания администратора (§4), после `create-admin.sh` — запустить повторно. Скрипт останавливается на первой ошибке (`set -euo pipefail`); старая версия приложения работает до `up app` — сайт недоступен только на время перезапуска контейнера (несколько секунд) и при ошибке сборки не страдает. Но **миграции к этому моменту уже применены**: миграции должны быть совместимы со старой версией кода (добавление полей/таблиц), ломающие изменения — в два релиза.

Смена только переменных окружения без пересборки (кроме `NEXT_PUBLIC_*`): `dc up -d app`.

## 6. Откат

`zevs-app:prev` — образ app, который **работал** в момент запуска `deploy.sh` (берётся из запущенного контейнера, не из `:latest`), поэтому повторный `deploy.sh` после неудачной сборки его не подменит. Команды отката — всегда с `--no-deps`: иначе compose сначала запустит сервис `migrate` (образ `zevs-migrate:latest` новой версии) и накатит миграции заново.

1. **Код без изменения схемы** (миграций в релизе не было):
   ```bash
   docker image tag zevs-app:prev zevs-app:latest
   dc up -d --no-build --no-deps app
   ```
2. **Релиз с миграциями**: сначала откатить схему образом новой версии (только он знает её миграции), затем код:
   ```bash
   dc run --rm --no-deps migrate node_modules/.bin/payload migrate:down   # откатывает последнюю пачку
   docker image tag zevs-app:prev zevs-app:latest
   dc up -d --no-build --no-deps app
   ```
   `migrate:down` удаляет добавленные колонки/таблицы вместе с данными в них — это деструктивно, только по решению владельца. Если `down` невозможен/опасен — восстановление из бэкапа, сделанного `deploy.sh` перед миграцией (`restore.sh db`, §7; он поднимает app с миграциями текущего `zevs-migrate:latest`, поэтому сначала выполнить п. 3).
3. Закрепить откат: `git checkout <тег рабочей версии> && dc build migrate` — теперь `zevs-migrate:latest` соответствует откаченному коду, и обычные `dc up` / `deploy.sh` не вернут новые миграции. До этого шага любые `dc up` без `--no-deps` применят их снова.
4. `:prev` хранит одну версию. Откат дальше — `git checkout <старый тег>` и `deploy/deploy.sh` (миграции вперёд не откатывает — см. п. 2).

## 7. Бэкапы

[`deploy/backup.sh`](../deploy/backup.sh): `pg_dump -Fc` (сжатый формат, восстанавливается `pg_restore`) из контейнера postgres + `tar.gz` тома media; проверка читаемости дампа (`pg_restore -l`); права 600 (`umask 077`); ротация `KEEP_DAYS` (14). Каталог — `BACKUP_DIR` (`/var/backups/zevs`). Пароль БД не передаётся в аргументах (локальный сокет внутри контейнера).

Cron (от пользователя с доступом к docker, `crontab -e`):

```cron
# ежедневно в 03:15; лог — для мониторинга
15 3 * * * /opt/zevs/deploy/backup.sh >> /var/log/zevs-backup.log 2>&1
# еженедельно — проверочное восстановление последнего дампа в отдельную БД
45 4 * * 0 /opt/zevs/deploy/restore.sh check "$(ls -1t /var/backups/zevs/db-*.dump | head -1)" >> /var/log/zevs-backup.log 2>&1
```

Бэкап на том же диске не спасает от потери сервера: копировать `/var/backups/zevs` на другой сервер **в РФ** (rsync по SSH-ключу / S3-хранилище российского провайдера), например:

```cron
30 3 * * * rsync -a --delete /var/backups/zevs/ backup@<хост-в-РФ>:/backups/zevs/
```

[`deploy/restore.sh`](../deploy/restore.sh):
- `restore.sh check <db-*.dump>` — восстановление в отдельную БД `zevs_restore_check`, вывод числа таблиц/миграций/товаров/заказов, удаление проверочной БД. Боевую БД не трогает. **Приёмка «бэкап восстанавливается» — этот прогон.**
- `restore.sh db <db-*.dump>` — замена боевой БД (спрашивает подтверждение, останавливает app, после — поднимает app; миграции догоняют схему до текущего кода).
- `restore.sh media <media-*.tar.gz>` — замена содержимого тома media.

Деструктивные режимы — только с подтверждения владельца, перед ними — свежий `backup.sh`.

## 8. Домен и HTTPS

Caddy ([`deploy/Caddyfile`](../deploy/Caddyfile)) сам получает и продлевает сертификаты Let's Encrypt (HTTP-01/TLS-ALPN, нужны открытые 80 и 443 и DNS на сервер), редиректит `http → https` и `www.<домен> → <домен>` (301). Сертификаты — в томе `caddy_data` (не удалять: лимиты Let's Encrypt на перевыпуск). Certbot не нужен.

Прочее в Caddyfile: сжатие zstd/gzip; `request_body` 100 МБ (файлы обмена 1С частями по `ONEC_EXCHANGE_FILE_LIMIT`, медиа до 25 МБ); таймаут ответа 300 с (шаг импорта 1С); HSTS; кэш картинок/видео на неделю (`/_next/static` Next отдаёт сам с `immutable`).

**X-Real-IP** (ARCHITECTURE, Решение 6): `header_up X-Real-IP {remote_host}` перезаписывает заголовок адресом клиента — подмена из запроса не проходит; `X-Forwarded-For` Caddy формирует сам и входящему не доверяет. Если перед Caddy появится ещё один прокси/CDN/балансировщик — настроить `trusted_proxies` и брать `{client_ip}`, иначе все клиенты будут с IP прокси (общий лимит). Приложение не публикуется наружу мимо Caddy (порт 3000 — только loopback). Caddy видит настоящий адрес клиента только при штатном iptables Docker и без IPv6-подключений в сеть без IPv6 (§1: Docker ≥ 28, без `"iptables": false`, без AAAA или с `enable_ipv6`) — проверяется в §11.

Переход со старого сайта (WordPress): редиректы старых URL — `lib/redirects.ts` (в сборке). Переключение DNS — в согласованное окно; TTL записей заранее снизить до 300.

## 9. Jobs (Б24) и несколько инстансов

Очередь `b24-sync` обрабатывается `autoRun` внутри процесса app раз в минуту (ARCHITECTURE, Решение 7). Планировщик стартует при инициализации Payload — первом запросе к app; healthcheck Docker (`/api/health`) делает такой запрос в течение 30–60 с после старта, так что отдельный «прогрев» не нужен.

Стек рассчитан на **один инстанс app**. При нескольких инстансах: `autoRun` выключить (переменная/правка конфига — отдельная задача) и вызывать `/api/payload-jobs/run` внешним cron с сессией admin; rate limit и дедуп форм живут в памяти процесса — нужен общий стор (Redis). Без этого не масштабировать.

## 10. Мониторинг и логи

- Состояние: `dc ps` (app `healthy`), `curl -s http://127.0.0.1:3000/api/health` → `{"status":"ok"}` / 503 `{"status":"db_unavailable"}`.
- `/api/health` — без данных и ПДн: проверяет процесс и доступность БД (`count` категорий). Для внешнего мониторинга (UptimeRobot-аналог в РФ, Яндекс Мониторинг) — `https://<домен>/api/health`, алерт на не-200.
- Логи: `dc logs -f app`, `dc logs caddy`, `dc logs postgres`; ротация json-file 5×20 МБ у app и caddy.
- Что смотреть: ошибки `b24-sync` в логах app и дашборд админки («Ошибка синхронизации …»), лог бэкапа (`/var/log/zevs-backup.log`), свободное место (`df -h`, `docker system df`), срок сертификата (Caddy продлевает сам; ошибки — в `dc logs caddy`).
- Обновления ОС и Docker — по регламенту хостинга; образы `postgres:16-alpine` и `caddy:2-alpine` обновляются `dc pull postgres caddy && dc up -d postgres caddy` (мажор postgres — только через dump/restore).

## 11. Проверка после деплоя (smoke)

```bash
curl -fsS https://<домен>/api/health                  # {"status":"ok"}
curl -sI http://<домен>/ | head -1                     # 301/308 → https
curl -sI https://www.<домен>/ | grep -i location       # → https://<домен>/
curl -s https://<домен>/api/users/init                 # {"initialized":true} после создания админа
curl -s -o /dev/null -w '%{http_code}\n' https://<домен>/sitemap.xml   # 200
```

В браузере: главная, каталог, карточка товара, блог, контакты; `/admin` — вход; отправка тестовой заявки с формы → появилась в «Заявки», в Б24 ушла (или видна ошибка синхронизации при выключенной интеграции); письмо дошло (SMTP). Тестовый заказ — только по согласованию (уйдёт в Б24 и 1С).

**IP клиента** (от него зависит rate limit): в Caddyfile временно раскомментировать блок `log`, `dc exec caddy caddy reload --config /etc/caddy/Caddyfile`; открыть сайт с внешнего устройства по IPv4 (и по IPv6, если у домена есть AAAA), в том числе с заголовком `curl -H 'X-Real-IP: 1.2.3.4' https://<домен>/`; в `dc logs caddy` поле `remote_ip` должно быть вашим внешним адресом — не `172.x`/`fd..` (шлюз Docker) и не `1.2.3.4`. Затем закомментировать `log` обратно и сделать reload (журнал с IP — ПДн, постоянно не держим).

## Проверить при первом прогоне

- `dc build app` с `build.network: host` и `extra_hosts`: Compose новых версий собирает через bake, которому нужен допуск `network.host`. Если сборка падает с ошибкой про entitlement/network или не резолвит `postgres` — `COMPOSE_BAKE=false deploy/deploy.sh` (классическая сборка через docker build).
- `dc up -d --wait app` при одноразовом `migrate` в `depends_on`: старые Compose считали завершившийся сервис ошибкой `--wait`. Если так — обновить Compose или временно убрать `--wait` и проверить `/api/health` вручную.
- Права томов: после первого `up` файл из админки загружается в «Медиа» и открывается по ссылке (том `media` принадлежит пользователю `node`).
- `deploy/create-admin.sh`, `backup.sh`, `restore.sh check` — первый прогон руками, смотреть вывод.

## Не проверено при подготовке

Docker на машине подготовки недоступен: образ не собирался, compose не поднимался, Caddyfile не валидировался (`caddy validate`), скрипты проверены `bash -n` и shellcheck, но не запускались. Локально: `next build --webpack` с `output: 'standalone'` проходит (против локальной БД), `node .next/standalone/server.js` стартует, `/api/health` при недоступной БД отвечает 503. Полнота трассировки `node_modules` в standalone на локальной машине не доказана (там `node_modules` — симлинк). Первый прогон на сервере — внимательно по шагам `deploy.sh`.

Next копирует `.env` проекта в `.next/standalone` — в Docker его нет (`.dockerignore: .env*`); при ручной сборке вне Docker не выкладывать `standalone` с `.env` разработчика.
