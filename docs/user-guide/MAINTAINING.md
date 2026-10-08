# Как обновить скриншоты и GIF документации

Материалы снимаются автоматически (Playwright + ffmpeg) на копии базы, чтобы не трогать рабочие данные.

1. **Копия БД** (читает основную, пишет в новую):
   ```bash
   docker exec zevs-postgres-1 psql -U zevs -d zevs -c "create database zevs_docs"
   docker exec zevs-postgres-1 pg_dump -U zevs zevs | docker exec -i zevs-postgres-1 psql -U zevs -d zevs_docs -q
   ```
2. **Тестовые учётки** (только на `zevs_docs`, скрипт сам отказывается работать на другой БД):
   ```bash
   DATABASE_URL=postgres://…/zevs_docs npx payload run scripts/docs/setup-accounts.ts
   ```
   Создаются `docs-admin@`, `docs-manager@`, `docs-content@`, `docs-buyer@example.test` с общим паролем из `scripts/docs/lib.mjs`.
3. **Сервер** на порту 43141 с `DATABASE_URL=…/zevs_docs`, `B24_WEBHOOK_URL=` и `SMTP_HOST=` (внешние системы выключены). `next dev` не запускается второй раз в том же каталоге, поэтому — из отдельного `git worktree`.
4. **Съёмка:**
   ```bash
   node scripts/docs/shoot-buyer.mjs         # публичные страницы и кабинет
   node scripts/docs/shoot-buyer-order.mjs   # заказ → счёт → кабинет (создаёт заказ в zevs_docs)
   node scripts/docs/shoot-manager.mjs       # админка
   node scripts/docs/record-gifs.mjs [имя]   # GIF в media/
   ```
   Сцена `g12-order-status` ожидает заказ `ZP-2026-0003` в статусе «Принят».

Файлы: `img/` — скриншоты (PNG), `media/` — GIF. Переменная `DOCS_BASE` меняет адрес сервера.

## Сайт справки (VitePress)

Конфиг — `.vitepress/config.mts`, исходники — этот каталог (`README.md` → главная).

```bash
npm run docs:dev      # разработка, http://localhost:43142
npm run docs:build    # статика в .vitepress/dist (в .gitignore), её можно отдать любым веб-сервером
npm run docs:preview  # просмотр собранного
```

Если справка живёт не в корне домена — `DOCS_BASE_PATH=/help/ npm run docs:build`.
