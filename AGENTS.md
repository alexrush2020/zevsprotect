# ЗевсПротект — правила работы агентов

Единый процесс для Claude Code, Codex и Cursor. Инструкции пользователя имеют приоритет; навыки из `.claude/skills/` дополняют этот файл техническими деталями, а не отдельным процессом.

## 0. Продукт и источники

- Сайт zevsprotect.ru: витрина + каталог + интернет-магазин + ЛК + блог + CMS, интеграции 1С КА 2 и Битрикс24. Заменяет сайт на WordPress.
- **Источник требований** — ТЗ и КП (сводка в [docs/TZ.md](docs/TZ.md)) и более поздние решения со встреч ([docs/meetings/](docs/meetings/)). **Источник вёрстки** — сам этот репозиторий: он вырос из кликабельного прототипа (https://zevsprotect-prototype.vercel.app, состояние на теге `prototype-final`). Существующие компоненты витрины — эталон UI: при подключении к Payload меняется источник данных, а не вёрстка. Решения заказчика по UX — раздел «Learned» в конце файла.
- Архитектура и решения — [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), технический справочник — [docs/AGENT-REFERENCE.md](docs/AGENT-REFERENCE.md), доска задач — [docs/workflow.html](docs/workflow.html).

## 1. Результат и план

- Определить ожидаемое поведение, границы задачи и наблюдаемые критерии приёмки. Не ослаблять требования ради закрытия и не добавлять попутные улучшения. Дефект, мешающий приёмке, входит в задачу.
- Небольшую задачу делать напрямую. Для нескольких зависимых этапов вести один короткий план в карточке доски: результат и границы → проверяемые этапы → риски/проверки → статус и следующий шаг. Не создавать документы для каждой роли.
- Рутинные обратимые решения принимать самостоятельно. Уточнять только существенные противоречия, выбор бизнеса и действия, требующие разрешения. В денежной (цены, НДС, счета, оплата) и правовой (152-ФЗ, ПДн) логике не подменять неизвестное требование предположением — карточка `own=business`.

## 2. Контекст и реализация

- Сначала прочитать затронутый код и значимые связи: коллекции Payload, хуки, route handlers, компоненты витрины, тесты. Искать адресно через `rg`.
- Следовать существующей архитектуре: данные — через Payload (Local API на сервере, REST только для клиента), никаких параллельных ORM и самописных админок. Устранять причину простейшим достаточным способом. Не выдумывать API Payload/Next — сверяться с `.claude/skills/payload/` и `node_modules/next/dist/docs/`.
- Новые зависимости — только при необходимости задачи, после проверки существующих средств (платформа, Payload, уже установленные пакеты).
- Вёрстку витрины не переписывать «попутно». Мок-слой прототипа (`lib/data/*`, `lib/store.tsx` на localStorage, `lib/integrations.ts`) заменяется на Payload постепенно, сохраняя типы из `lib/types.ts` как контракт компонентов. Отступать от UI прототипа можно только по ТЗ, решению со встречи или бизнеса — с записью в карточке.

## 3. Среда, данные и внешние действия

- Агенты работают только на локальной среде: PostgreSQL из `docker-compose.yml` (порт 5442), приложение `npm run dev` на хосте (порт 43127). Подробности — [AGENT-REFERENCE](docs/AGENT-REFERENCE.md).
- **Бэкап перед изменяющей seed/DB-операцией на локальной БД с ценными данными.** Деструктив (drop/reset, `down -v`, TRUNCATE, массовое удаление) — только с явного подтверждения владельца.
- Схема БД меняется через миграции Payload (`npm run payload migrate:create`), не через ручной SQL. В dev-режиме Payload синхронизирует схему сам (`push`); перед деплоем обязательна миграция. Журнал миграций — один писатель.
- **Подагентам нельзя** seed, DB-write/reset, миграции и пишущие e2e на общей БД; им доступны чтение, чистые unit-тесты и typecheck.
- Внешние системы (1С, Битрикс24, платёжный сервис, почта/SMS) в разработке — только тестовые/sandbox-учётки или моки. Боевые вебхуки и ключи не вызывать без прямого поручения. Секреты не выводить и не коммитить; `.env` не менять без разрешения.
- `git push`, деплой и операции на сервере — только по отдельному прямому поручению владельца. Коммитить только файлы своей задачи; не `git add -A` в общем дереве с чужими правками.

## 4. Проверка результата

- Проверять реалистичные сбои затронутого поведения: отказ, границы, повтор, поздний ответ (особенно вебхуки 1С/Б24/оплаты — идемпотентность и повторная доставка).
- На промежуточных шагах — адресные тесты (`vitest`) и lint; `npm run typecheck` (tsc --noEmit) — перед коммитом кода и приёмкой блока. После изменения коллекций — `npm run generate:types` и `npm run generate:importmap`.
- `next build` — при изменениях, способных сломать bundling/SSR/RSC, и перед закрытием этапа.
- **UI проверять в браузере на текущем коде**: скриншоты на `1440×900`, `768×1024`, `375×812` (`node scripts/shoot.mjs`), просмотренные глазами; при сомнении в регрессии — сравнить с прототипом (тег `prototype-final` или https://zevsprotect-prototype.vercel.app), плюс относящиеся к изменению loading/empty/error-состояния. Скриншоты — только в `screenshots/` (в .gitignore). A11y-snapshot не доказывает отсутствие обрезки.
- Для денег (сумма заказа, перерасчёт «Повторить заказ», счёт) — проверять формулу, округление и совпадение клиента и сервера; цену всегда пересчитывает сервер. Для доступа — роль/чужой клиент/гость, серверный access control Payload, отсутствие утечки ПДн.

## 5. Делегирование и ревью

- По умолчанию один исполнитель. Делегировать только самостоятельный кусок (например, отдельную коллекцию или интеграцию) или независимое ревью существенного риска. До параллельной работы определить вход/выход, непересекающиеся файлы и владельца интеграции; общие токены/компоненты layout и коллекции держать у одного владельца.
- Подагенту передать конкретную задачу, границы, критерии и нужные файлы; не запускать цепочку dev → QA → fix → QA на каждый пункт.
- Одно независимое ревью завершённого блока — при риске потери данных, нарушения доступа, ошибочного расчёта денег или сложной конкуренции (обмен с 1С, статусы из Б24, оплата).

## 6. Учёт результата и остановка

- Доска [docs/workflow.html](docs/workflow.html) — источник продуктовых задач. Для порученной карточки работать по её `req/acc/links`, зависимости — в `deps`, владелец следующего шага — `own=agent|business`. Следующую задачу брать `list --ready --own agent` только в рамках поручения продолжать очередь.
- Править доску только через `bun docs/workflow/wf.mjs`; перед коммитом доски — `wf lint`. Отдельный коммит `docs(workflow): …` на согласованный результат блока. Закрытие: `st=done`, `res` с коммитом и реально выполненными проверками, живые `--anchors`.
- Противоречие источников (ТЗ ↔ КП ↔ прототип) — запись в [docs/CONTRADICTIONS.md](docs/CONTRADICTIONS.md) и карточка `own=business`. Долговременное архитектурное решение — раздел «Решения» в ARCHITECTURE.md.
- Перед завершением сверить diff с задачей: пропуски, регрессии, случайные изменения. Итог кратко: что изменено, чем проверено, ограничения; для изменённого поведения — короткие шаги воспроизведения.

Ответы, комментарии и сообщения коммитов — по-русски; идентификаторы следуют стилю кода.

## Learned User Preferences

<!-- Накоплено при работе над прототипом (sandra85). Действует и для продакшена, если ТЗ/встреча не решили иначе. Порт превью — 43127. -->

- Reply in Russian; the user writes in Russian and expects Russian-language updates.
- Change only the requested UI or copy; when told «больше ничего не меняй», leave surrounding layout and text alone.
- Verify visual work in the browser; the user iterates from screenshots and wants photorealistic rugged industrial imagery with the glove as the focal point, not stylized, cartoon, robotic, or bland corporate layouts.
- Generated glove photos must use the official zevsprotect cuff mark, centered on the cuff — not a similar or invented logo, and not a different mitt.
- Keep the metallic shimmer logo animation on brand marks (about page and home), matching the about-page treatment.
- Do not mention the factory founding year (2005) or invent earlier «берут с 2019/2020» customer dates; the company is from 2025.
- Work only in the main `sandra85` tree and preview on port 43127; do not start a second prototype or a worktree copy that drops photorealistic assets.
- Borrow catalog, reviews, live-consultant, account, and cart/checkout interaction from the Sharteks prototype, restyled to zevsprotect; do not copy Sharteks branding. Login and registration share one page (default: login, with password recovery on the same card); login is a Yandex stub (not Google); registration is private individual or legal entity.
- Catalog product cards should show wholesale unit price vs volume on an integrated tracker (slider checkpoints, ₽/смену) — not a leftover «опт от…» badge or a separate widget; extra specs reveal on hover so rest-state cards stay equal height; sizes are chips even when only one size exists, left-aligned, with coating as a click-dropdown on the right of the same row; order qty uses a visible minimum and a hidden packing step (50 pairs fabric/PVC, 12 coated/облив), rounding up on manual input; keep the model comparison on the product page.
- Cart lines use the same visual volume/discount tracker as catalog cards; size and coating are separate stacked sections (not one row); do not repeat size/coating labels on the qty stepper when those blocks are already above.
- Review cards show the city under the company name so text lines align, with photos and company/footer rows on one level across cards; overflowing quotes use «прочитать полностью» to the reviews page with that review’s anchor; do not label the block «Проходная» or use «Арсеналтрейдинг» (that slot is «Прибой»).
- Blog and article preview images should not be cropped — use contain, not 16:9 cover.

## Learned Workspace Facts

- This is a Next.js prototype of zevsprotect® (зевспротект), a Taganrog PPE / work-glove brand; slogan is «Сила в ваших руках»; live reference site is https://zevsprotect.ru.
- Geography: 85 Russian regions plus Belarus and Kazakhstan.
- Hero product shot is the orange «Феникс» glove, not the blue Atlant.
- Contact messenger is MAX only (use the official MAX mark, cropped and styled to the site); do not mention WhatsApp or Telegram or show their logos. Header icons should not float as a right-side cluster.
- The back-to-top control is the photorealistic orange Феникс glove (`/hero/glove-point-up.png`) with the index finger pointing up, stacked immediately above the live-chat control (including when the chat panel is open); do not replace it with an SVG or cardboard mitt.
- The about page keeps the workshop reel at `/about/workshop.mp4` (not a stock clip), a metallic shimmering logo, and in-use work-scene photos rather than a lone product glove in the hero.
- The catalog purchase guide («Гид закупщика») opens as an in-page modal, not a separate route; catalog filters include model length, pair weight, tex, and knitting class in addition to base, coating, color, and size.
- Contacts page keeps a two-column layout: directory on the left, feedback form on the right; messenger buttons sit above the inquiry CTA.
- Private GitHub remote: https://github.com/merovingen-kein/sandra85.
- Stable Vercel production URL: https://zevsprotect-prototype.vercel.app (project `zevsprotect-prototype`, team VZR).
- Sharteks prototype at https://sharteks-prototype.vercel.app is the UX reference for catalog hover (side actions: избранное, быстрый заказ, отзывы, заказать образцы — отзывы orange like избранное, образцы blue like быстрый заказ), product reviews, «уточнить у менеджера» live chat, the account cabinet, and cart (заявка to a manager vs заказ to checkout with saved addresses).
- Batch/product documents keep the declaration, not «Протокол испытаний».

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
