# Архитектура

Одно приложение: **Next.js 16 (App Router) + Payload CMS 3 + PostgreSQL 16**. Витрина и админка в одном процессе и одном деплое. Требования — [TZ.md](TZ.md) и [meetings/](meetings/). Витрина — выросший из прототипа код этого репозитория (тег `prototype-final`).

```
Next.js 16 ─┬─ (frontend)  витрина из прототипа (Tailwind v4, shadcn/base-ui, motion, Inter + Unbounded)
            ├─ (payload)   /admin — Payload CMS (ru), /api/* — REST Payload
            └─ route handlers интеграций
                 /api/1c-exchange       ← 1С КА 2, CommerceML 2 (стандартный узел «Обмен с сайтом»)
                 /api/b24/webhook       ← исходящий вебхук Битрикс24 (смена стадии сделки)
                 /api/payments/webhook  ← платёжный сервис (статус оплаты)
PostgreSQL ── коллекции Payload + payload-jobs (очередь отправок в Б24 с ретраями)
Media ─────── локальный диск (volume), при необходимости — S3 в РФ
```

## Структура кода

```
app/(frontend)/        страницы витрины (из прототипа)
app/(payload)/         админка и REST Payload (генерируется)
app/api/<integration>/ route handlers интеграций и pricelist
payload.config.ts      конфиг Payload
payload/collections/   схема: коллекции; payload/globals/ — глобалы; payload/access.ts — права
payload/jobs/          задачи Payload Jobs (отправка в Б24 с повтором)
components/            UI витрины (ui/ — примитивы shadcn)
lib/types.ts           контракт данных для компонентов
lib/data/, lib/store.tsx, lib/integrations.ts   мок-слой прототипа → заменяется Payload
lib/server/            серверный доступ к данным (Local API → типы lib/types.ts)
integrations/onec|bitrix24|payments/   чистая логика обмена, покрыта unit-тестами
scripts/               shoot.mjs, seed из мок-данных прототипа
```

## Модель данных (Payload)

| Коллекция | Назначение | Ключевые поля |
|---|---|---|
| `users` (auth) | Администраторы | `role`: admin / manager / content |
| `customers` (auth) | Клиенты ЛК | ФИО, телефон, email, организация, ИНН, адреса, `yandexId`, `b24CompanyId`, `onecId` |
| `categories` | 7 категорий по видам защиты (+ подкатегории через `parent`) | title, slug, иконка/картинка, порядок, SEO |
| `products` | Каталог (80–90 шт.) | `guid1c`, sku, slug, title, gallery, description, основа, покрытие, цвет, размеры[], класс/плотность и прочие характеристики, price, stock, minQty, упаковка, документы[], related[], `_status` (публикация), **`manualOverride`**, SEO |
| `orders` | Заказы | number, customer \| guest{…}, items[] (снапшот: product, sku, title, price, qty), total, delivery{…}, comment, `paymentMethod` invoice/online, `paymentStatus`, `status` (T-ST), `b24DealId`, `onecExportedAt`, `syncError` |
| `leads` | Заявки со всех форм | `type` feedback / calculation / samples / consultation / product-request / pricelist / cart, данные формы, согласие ПДн, `b24LeadId`, `syncError` |
| `reviews` | Отзывы на товары | product, author, rating, text, `approved` |
| `posts`, `post-categories` | Блог | title, slug, cover, excerpt, content (lexical), category, related[], publishedAt, SEO, черновики |
| `pages` | Прочие информационные страницы | title, slug, content, SEO |
| `media` | Изображения и документы (сертификаты, PDF) | alt |
| Globals | `home`, `about`, `delivery`, `settings` (контакты, реквизиты, телефоны, ИНН, счётчики, баннеры) | по блокам прототипа |

## Потоки

- **Каталог:** 1С → `/api/1c-exchange` (`checkauth → init → file → import`) → парсер CommerceML (`import.xml` товары/группы/свойства, `offers.xml` цены/остатки) → upsert по `guid1c` через Local API. Товары с `manualOverride=true` не перезаписываются (T-1C, ручная правка при ошибках 1С). Картинки из пакета обмена → Media.
- **Заказ:** корзина (клиент, localStorage) → server action `createOrder`: **цены пересчитываются на сервере** из `products`, номер заказа, валидация, согласие ПДн → `orders` → `afterChange` ставит job `b24.deal` (для зарегистрированного клиента; для гостя — по BIZ-решению) → 1С забирает заказы `type=sale&mode=query`, подтверждает `success`.
- **Статусы:** Б24 (смена стадии сделки) → `/api/b24/webhook` → `crm.deal.get` → маппинг стадии → `orders.status`. Маппинг стадий — в `settings`, т.к. воронку настраивает заказчик.
- **Оплата:** онлайн — создание платежа у провайдера (по умолчанию ЮKassa), вебхук → `paymentStatus`; идемпотентность по id платежа. Счёт — PDF с реквизитами из `settings`, формируется по кнопке в ЛК/после заказа; ручной сценарий менеджера идёт мимо сайта.
- **Формы:** server action → `leads` → job `b24.lead`.
- **Регистрация:** `customers` create → job `b24.company` (компания + контакт).
- **Повторить заказ:** копия позиций текущих опубликованных товаров по актуальным ценам; изменившиеся цены и недоступные товары показываются клиенту до подтверждения.
- **Ошибки обмена:** все исходящие вызовы Б24 — через Payload Jobs с ретраями и backoff; последняя ошибка пишется в `syncError` документа, в админке — кнопка «Отправить повторно».

## Доступы

- `users.role`: admin — всё; manager — заказы, лиды, клиенты, отзывы (чтение каталога); content — страницы, блог, каталог, медиа.
- `customers` видят только свои заказы (access по `req.user`), не видят чужие ПДн. Гостевой заказ читается только по номеру + телефон (трекинг) без ПДн в ответе.
- Витрина читает только опубликованное (`_status=published`).

## Реестр моков (регресс 2026-09-30)

Живое на Payload: каталог, категории (шапка, футер, меню, фильтры — из стора, наполняется в `layout`), заявки (`submitLead`, включая быстрый заказ), заказы и трекинг (`createOrder`, `trackOrder`), вход/регистрация/профиль клиента, отзывы, блог, глобалы Home/About/Delivery/Settings, прайс, метки карточек (`products.badges`), Яндекс.Метрика.

Что ещё **мок или localStorage** (в коде помечено `MOCK`/комментарием; при переводе на бэкенд — убирать из этого списка):

| Место | Что | Состояние / блокер |
|---|---|---|
| `/pay/[id]*`, `lib/integrations.ts`, `IntegrationLog` | мок ЮKassa и журнал обмена (только для демо-заказов localStorage) | SH-PAY, BIZ-4 |
| `lib/delivery.ts` | выдуманные тарифы ТК, ориентир на витрине; в заказ не входят | BIZ-9, CONTRA-5 |
| `components/manager-chat/`, `lib/manager-chat*.ts` | сценарный чат с шаблонными ответами | SH-CHAT: открытые линии Б24 |
| `lib/account-notices.ts`, `/account/notifications` | уведомления и настройки в localStorage | нет коллекции; CONTRA-1 |
| `lib/store.tsx`: избранное, `zp-orders`, `zp-leads` | локальное состояние (гостевая корзина — норма) | избранное → поле клиента; `zp-orders` — только для старых заказов прототипа |
| `/account/orders`: отзывы | показываются только свои отзывы на модерации; одобренные свои с сервера не подгружаются | добавить серверный запрос «мои отзывы» |
| `lib/data/purchase-guide.ts`, `brand.ts`, массивы в `about-view`, `site-header`, `site-footer` | тексты и реквизиты в коде | подключить `settings`/globals по мере надобности |
| `lib/b24/config.ts` | ID воронки/стадий Б24 | ждём портал заказчика (BIZ-5) |

Серверные компоненты страниц читают данные через Local API; клиентские получают их пропсами. Контракт компонентов — `lib/types.ts`.

## Решения

1. **Payload CMS вместо самописной админки** (2026-09-29). Payload встраивается в тот же Next.js, из коробки даёт админку на русском, auth (для админов и ЛК клиентов), access control, медиа, черновики/версии, SEO-плагин, хуки и очередь задач с ретраями. Своя админка с тем же объёмом не укладывается в бюджет этапа 4 (65 000 ₽). Отказ от Payload имеет смысл только при нестандартном рабочем месте менеджера — не наш случай, статусы ведутся в Б24.
2. **Обмен с 1С по CommerceML**, а не собственный API: в 1С КА 2 это штатный узел «Обмен с сайтом», доработки 1С не нужны.
3. **Продакшен на VPS в РФ** (152-ФЗ), Docker: приложение + PostgreSQL + volume media. Vercel — только для демо-стендов без реальных ПДн.
4. **npm** (как в прототипе), Node ≥ 20; тесты — Vitest (unit/integration), Playwright (e2e и скриншоты).
5. **Основа — исходники прототипа** (2026-09-29): репозиторий найден, пересборка по вёрстке отменена. Payload встроен в то же приложение, витрина перенесена в `app/(frontend)`.
6. **Прокси и IP клиента** (2026-09-30). Rate limit форм, заказов и `/track` берёт IP из `x-real-ip`. Прокси перед приложением обязан перезаписывать заголовок (`proxy_set_header X-Real-IP $remote_addr;` в nginx), иначе лимит обходится подменой. Счётчики лимита и дедуп — в памяти процесса: при нескольких инстансах нужен общий стор (Redis).
7. **Очередь Payload Jobs** (2026-09-30). Обмен с Б24 идёт задачами `b24-sync` (повторы с backoff, `syncError` в документе). `autoRun` работает внутри процесса Next (`next start`); на serverless или нескольких инстансах — внешний cron на `/api/payload-jobs/run` с сессией admin. Миграция создаёт таблицу `payload_jobs`.
