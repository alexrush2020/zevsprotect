# Админка Payload и модели данных — спецификация

Дата: 2026-09-29. Статус: черновик на ревью.
Источники: `html/zevs-cabinet-export` (макет), [ARCHITECTURE.md](../../ARCHITECTURE.md), [TZ.md](../../TZ.md), `lib/types.ts` (контракт витрины), карточки доски S-5, C-CAT, C-ORD, C-LEADS, C-BLOG, C-REV, C-CONTENT.

## 1. Цель и границы

**Результат.** `/admin` выглядит как макет (две темы, оранжевый акцент, навигация по группам, дашборд); в Payload заведены все коллекции и глобалы с ролями и доступами.

**Входит:** схема данных, access-хелперы, хуки полей (номер заказа, история статусов, защита от импорта), русские лейблы, группы меню, тема, `AdminNav`, `Dashboard`, SEO-плагин, версии/черновики, unit-тесты access и хуков.

**Не входит:** перевод витрины на Payload (F-*, S-6 сид, S-7 серверный слой), логика обмена 1С/Б24/оплаты (I-*, SH-PAY), кабинет клиента (экраны Main/Order макета — витрина), переключатель языка ru/en (в ТЗ нет локализации), кастомные list/edit view (списки и карточки документов — нативные Payload).

**Критерии приёмки.**
1. Админ входит в `/admin` на русском, видит навигацию из 4 групп и дашборд; тема переключается dark/light.
2. Каждая коллекция из §4 создаётся/правится/удаляется через админку; `npm run typecheck` и `payload generate:types` проходят.
3. Тесты access (§3) зелёные: manager не правит каталог; content не видит заказы и клиентов; клиент читает только свои заказы; аноним читает только опубликованное.
4. `manualOverride` защищает поля товара от записи из импорта (флаг `context.fromImport`).
5. Скриншоты `/admin` (дашборд, список моделей, карточка модели) на 1440×900 и 375×812 просмотрены глазами в обеих темах.

## 2. Подход и порядок

Разбиение по доменам с непересекающимися файлами.

| Этап | Кто | Файлы |
|---|---|---|
| 0. Фундамент (S-5) | основной агент | `payload/access.ts`, `payload/collections/Users.ts`, `payload.config.ts` (i18n, группы), `payload/fields/*` (общие поля) |
| 1a. Каталог | подагент | `payload/collections/{Categories,Products,Media,Reviews}.ts` |
| 1b. Продажи | подагент | `payload/collections/{Customers,Orders,Leads}.ts`, `payload/hooks/orders.ts` |
| 1c. Контент | подагент | `payload/collections/{Posts,PostCategories,Pages}.ts`, `payload/globals/*` |
| 1d. UI | подагент | `app/(payload)/custom.scss`, `payload/components/{AdminNav,Dashboard,Icon,Logo}.tsx` |
| 2. Интеграция | основной агент | регистрация в `payload.config.ts`, `generate:types`, `generate:importmap`, миграция, seed админа |
| 3. Ревью | независимый агент | diff блока «Продажи» + access (деньги и ПДн) |
| 4. Доска | основной агент | закрытие карточек через `wf`, `wf lint` |

Подагентам запрещены seed, DB-write, миграции (AGENTS.md §3): им доступны чтение, `tsc`, чистые unit-тесты. Регистрацию в `payload.config.ts`, миграции и `generate:*` выполняет только основной агент. Этап 1 стартует после этапа 0.

## 3. Роли и доступы (`payload/access.ts`)

`users.role`: `admin | manager | content` (обязательное, по умолчанию `content`). `customers` — отдельная auth-коллекция ЛК.

Хелперы: `isAdmin`, `hasRole(...roles)`, `publishedOrAuthed` (аноним → `{_status: {equals:'published'}}`, staff → всё), `ownOrStaff` (клиент → `{customer: {equals: user.id}}`).

| Коллекция | admin | manager | content | customer | аноним |
|---|---|---|---|---|---|
| users | CRUD | читает себя | читает себя | — | — |
| customers | CRUD | читает, правит | — | читает/правит себя | create (регистрация) |
| categories, products | CRUD | читает | CRUD | — | читает опубликованное |
| media | CRUD | читает | CRUD | — | читает |
| reviews | CRUD | CRUD | — | create (свои) | читает `approved=true` |
| orders | CRUD | читает, правит статус/оплату/sync | — | читает свои | — (гостевой трекинг — серверный handler, вне объёма) |
| leads | CRUD | читает, правит | — | — | create |
| posts, post-categories, pages | CRUD | читает | CRUD | — | читает опубликованное |
| globals | правит | читает | правит контентные | — | читает |
| settings (global) | правит | читает | — | — | публичные поля (контакты) через `access.read` на поля |

Заказы удаляет только admin. Поля `b24*`, `onec*`, `syncError` — `access.update` только admin.

## 4. Модели данных

Общие правила: русские `labels`; `admin.group` из §5; `timestamps` по умолчанию; slug — уникальный, `index: true`; денежные поля — `number` в рублях с копейками (2 знака), формула и округление проверяются на сервере (не в этой задаче); `versions.drafts` — только у `products`, `posts`, `pages`.

### 4.1 `categories`
`title` text*, `slug` text* unique, `parent` rel→categories, `icon` text (имя иконки прототипа), `image` upload→media, `order` number, SEO. Слаги семи категорий: `mehanika holod zhar mbs himiya kragi rukavitsy` (= `CategorySlug`).

### 4.2 `products` (Модели)
Основное: `title`*, `slug`* unique, `sku`* unique, `guid1c` unique, `category`* rel→categories.
Характеристики (фильтры витрины): `base`, `coating`, `coatingType`, `colors` text[] (hasMany), `sizes` text[] (hasMany, chips M/L/XL/XXL), `knitClass` text (валидатор: число 5–18), `tex`, `weight`, `length`; `specs[]` {`key`,`value`}.
Описание: `description` lexical.
Медиа: `gallery[]` {`image` upload→media*}, первое — главное; `documents[]` {`title`, `file` upload→media} (декларации; не «протокол испытаний»).
Цена и остаток: `price` number, `stock` number, `unit` text (default «пара»), `minQty` number (default 50), `packSizes` number[] (hasMany). Read-only в админке, если `guid1c` задан и `manualOverride=false`.
Метки (sidebar): `badges` select hasMany: `hit | new | sale | home` (`home` = `Product.featured`).
Служебные: `manualOverride` checkbox — поля из импорта 1С не перезаписываются; `related[]` rel→products.
Хук `beforeChange`: если `context.fromImport && doc.manualOverride` — вернуть прежние значения защищённых полей (title, description, характеристики, gallery, price, stock).
Версии/черновики; SEO.

### 4.3 `media`
`alt` text (обязателен для изображений), `title` text; `upload`: `mimeTypes` image/jpeg|png|webp, application/pdf|docx|xlsx; `focalPoint: true`; `imageSizes`: thumbnail 300×300, card 600×600, hero 1200×1200; лимит 10 МБ (изображения) / 25 МБ (документы) — `limits.fileSize` глобально 25 МБ + валидатор на изображениях. Поле `kind` (image|doc), вычисляется хуком по mime — для табов «Все/Изображения/Документы» списка.

### 4.4 `reviews`
`product` rel→products*, `authorName`*, `company`, `city`, `rating` 1–5*, `text`*, `approved` checkbox (default false), `customer` rel→customers (авто из `req.user`).

### 4.5 `customers` (auth, ЛК)
`kind` select `person|legal`, `name`*, `phone`*, `company`, `inn`, `kpp`, `address`, `addresses[]` {`label`,`city`,`line`,`phone`,`isDefault`}, реквизиты `bankName`, `bankAccount`, `bik`, `authProvider` select `phone|yandex|password`, `yandexId`, `favorites[]` rel→products, `consentPdAt` date (согласие на ПДн), `b24CompanyId`, `b24ContactId`, `onecId`, `syncError` (read-only). Валидатор ИНН: 10 цифр для legal, 12 для person.

### 4.6 `orders`
`number` text unique (формат `ZP-YYYY-NNNN`, генерирует `beforeValidate` из счётчика; read-only), `customer` rel→customers, `guest` group {name, phone, email, company, inn} (заполнено, если `customer` пуст — валидатор «одно из двух»), `items[]` {`product` rel, `sku`, `title`, `size`, `coating`, `price` (снапшот), `qty`}, `total` number (read-only, пересчёт `beforeChange` = Σ price·qty + `delivery.cost`, округление до копеек), `delivery` group {`city`, `carrier` select cdek|terminal|pickup, `carrierName`, `cost`, `address`}, `comment`, `paymentMethod` select `invoice_auto|invoice_manager|online`, `paymentStatus` select `pending|invoiced|paid|failed`, `status` select `accepted|picking|shipped|delivery|delivered|cancelled`, `statusHistory[]` {`at`, `status`, `note`} (пишется `beforeChange` при смене `status`; read-only), `consentPdAt`, `b24DealId`, `onecExportedAt`, `syncError`, `paymentId` (идемпотентность вебхука; unique, sparse).
Список: колонки number, customer/guest, total, status, paymentStatus, createdAt; фильтры по статусу и оплате. Кнопка «Отправить в Б24 повторно» — UI-заглушка поля (`ui` field), вызов job — в I-B24-DEAL.
Цену и итог витрина не присылает — сервер пересчитывает; в этой задаче хук `total` защищает от расхождения.

### 4.7 `leads`
`type` select `feedback|calculation|samples|consultation|product-request`*, `name`, `phone`, `email`, `company`, `message`, `data` json (остальные поля формы), `consentPdAt`*, `sourceUrl`, `b24LeadId`, `syncError`, `status` select `new|processed` (default new).

### 4.8 `posts`, `post-categories`, `pages`
- `post-categories`: `title`*, `slug`*.
- `posts`: `title`*, `slug`*, `category` rel, `cover` upload, `excerpt`*, `content` lexical, `related[]` rel→posts, `publishedAt`, `home` checkbox (`Article.home`), `slides[]` {`image`,`title`,`alt`}, SEO, черновики.
- `pages`: `title`*, `slug`*, `content` lexical, SEO, черновики.
- Обложки блога на витрине показываются `contain` (не кроп) — учесть в `admin.description` поля `cover`.

### 4.9 Globals
- `home`: блоки главной (hero-тексты, `featuredProducts[]`, `featuredPosts[]`, баннеры).
- `about`: тексты, документы (декларации), видео `workshop` (upload).
- `delivery`: тексты, условия, тарифы-подсказки.
- `navigation` («Меню»): `header[]`, `footer[]` {`label`,`url`}.
- `settings`: контакты (`phone`, `email`, `address`, `max` — ссылка мессенджера MAX; WhatsApp/Telegram не заводить), реквизиты для счёта (`legalName`, `inn`, `kpp`, `ogrn`, `bank*`), счётчики аналитики, `b24StageMap[]` {`stage`,`status`}. Год основания в полях не хранить.

### 4.10 SEO
`@payloadcms/plugin-seo` для categories, products, posts, pages: `meta.title` (счётчик 60), `description` (160), `image`; предпросмотр поиска — штатный. Зависимость `@payloadcms/plugin-seo` версии 3.90.2 (как остальные пакеты Payload).

## 5. Интерфейс админки

**Тема.** `app/(payload)/custom.scss`: токены `tokens.css` макета на `:root` и `[data-theme=dark|light]`; маппинг на переменные Payload (`--theme-bg`, `--theme-elevation-*`, `--theme-text`, `--color-*`), акцент `--accent`. Переключатель — стандартная тема Payload (`data-theme` пишет сам Payload); токены не должны ломать контраст (AA). Шрифты: IBM Plex Sans + JetBrains Mono, как в макете.

**Навигация** (`admin.components.Nav`): бренд «зевспротект® · CMS», группы и пункты с иконками, «Открыть сайт», карточка пользователя (имя, роль) — по `AdminNav.dc.html`. Пункты фильтруются по роли пользователя (скрыто то, к чему нет доступа).

| Группа | Пункты |
|---|---|
| Каталог | Модели, Категории, Медиа, Отзывы |
| Контент | Статьи, Рубрики блога, Страницы, Меню, Главная, О компании, Доставка, Настройки |
| Продажи | Клиенты, Заказы, Заявки |
| Система | Пользователи |

**Дашборд** (`admin.components.views.dashboard`): сервер-компонент через Local API с `req.user` (access соблюдается). Карточки-счётчики по 3 группам с подписями (черновики моделей, заказы в работе, заявки); «Требует внимания» (черновики моделей, документы с `syncError`, заказы `paymentStatus=pending`); «Последние изменения» (5 последних обновлений products/posts/pages). Пустые/ошибочные состояния — без падения страницы.

**Иконки:** инлайн SVG из макета в `payload/components/Icon.tsx`.

## 6. Тесты и проверки

- Vitest (чистые): `access.test.ts` — матрица §3 на функциях доступа; `orders.hooks.test.ts` — номер, `total`, `statusHistory`; `products.hooks.test.ts` — `manualOverride`; валидаторы (ИНН, класс вязки, «customer или guest»).
- `npm run typecheck`, `npm run generate:types`, `npm run generate:importmap`; `next build` в конце этапа.
- Ручная приёмка в браузере — критерий 5; `node scripts/shoot.mjs` или Playwright, снимки в `screenshots/`.
- Миграция `npm run payload migrate:create` перед закрытием (один писатель — основной агент); перед изменяющей операцией на локальной БД — бэкап.

## 7. Риски

- Стили Payload меняются между минорами — привязка к `--theme-*` переменным, а не к внутренним классам.
- Дашборд читает много коллекций — `count` с `overrideAccess: false` и `limit: 5`, без выборки тел.
- Конфликт стадий: макет показывает prod/transit/pay/done, прототип и `lib/types.ts` — 6 статусов `OrderStatus`. Берём `OrderStatus` как контракт; соответствие стадиям Б24 — `settings.b24StageMap`.
- `total` считается в админке и на сервере витрины по одной формуле; при появлении НДС/скидок (BIZ-8) хук пересматривается (карточка `own=business`, предположений о НДС не делаем).
- Гостевой трекинг и отправка в Б24 не реализуются здесь; поля и заглушки подготовлены.

## 8. Соответствие карточкам доски

S-5 (роли, i18n, группы) — этап 0; C-CAT — 1a; C-REV — 1a; C-ORD, C-LEADS — 1b; C-BLOG, C-CONTENT — 1c; UI (тема, навигация, дашборд) — новая карточка `A-UI` в треке cms (создаётся при планировании); закрытие каждой — по `wf` с фактическими проверками.
