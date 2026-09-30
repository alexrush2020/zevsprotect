# Технический справочник для агентов

Процесс и разрешения — [AGENTS.md](../AGENTS.md). Этот файл читать по задаче; он не назначает дополнительных гейтов. Реальные команды сверять с `package.json`.

## Стек и навигация

- Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui на `@base-ui/react`, `motion`, `lucide-react`, `sonner`. Next.js 16 отличается от обучающих данных: перед использованием API читать `node_modules/next/dist/docs/`.
- Payload CMS 3 (`payload.config.ts` в корне, коллекции — `payload/collections/`, типы — `payload/payload-types.ts`), `@payloadcms/db-postgres`, редактор Lexical. Навык: [.claude/skills/payload/SKILL.md](../.claude/skills/payload/SKILL.md) + `reference/`.
- Пакетный менеджер — **npm** (`package-lock.json`).

| Где | Что |
|---|---|
| `app/(frontend)/` | Витрина: страницы прототипа (главная, каталог, товар, корзина, checkout, ЛК, счёт, оплата, трекинг, блог, B2B-страницы) |
| `app/(payload)/` | Админка `/admin` и REST `/api/*` Payload (генерируется; руками — только `custom.scss`) |
| `app/api/pricelist` | Прайс CSV (статический сегмент приоритетнее `/api/[...slug]` Payload) |
| `components/` | UI витрины; `components/ui/` — примитивы shadcn |
| `lib/types.ts` | Контракт данных компонентов — сохранять при переводе на Payload |
| `lib/data/catalog.ts` | Сид-источник и справочные функции (`buildSpecFilters`, `productSeo`); рантайм-данные — из Payload, актуальный список моков — в ARCHITECTURE «Реестр моков» |
| `lib/store.tsx` | **Мок** корзины/пользователя/заказов/заявок в localStorage → корзина остаётся клиентской, остальное — Payload |
| `lib/integrations.ts`, `components/integration-log.tsx` | **Мок** журнала обмена 1С/Б24/ЮKassa → реальные интеграции |
| `public/` | Фото, видео цеха, бренд, документы (22 МБ) — не терять при worktree/деплое |

## Локальный стенд

| Что | Как |
|---|---|
| БД | `docker --context default compose up -d` → PostgreSQL 16 на `127.0.0.1:5442` (zevs/zevs/zevs). Docker Desktop-контекст на этой машине нестабилен — использовать `--context default` |
| Почта | тот же `compose up -d` поднимает mailpit: UI http://localhost:43126, SMTP `localhost:43125` (в `.env`: `SMTP_HOST=localhost`, `SMTP_PORT=43125`) |
| Приложение | `npm run dev` → http://localhost:43127, админка http://localhost:43127/admin |
| Приложение в Docker | `make local-up` (профиль `app`, контейнер `zevs-app`, та же БД) → http://localhost:43128 и http://zevs.test. Исходник — bind-mount, `node_modules` и `.next` — тома; зависимости переустанавливаются сами при смене `package-lock.json`. Команды — `make help` |
| zevs.test | общий nginx-local (`~/web/nginx_local`, `conf.d/zevs.test.conf` → `zevs-app:43127` по сети `dev-local`) + строка `127.0.0.1 zevs.test` в `/etc/hosts`. nginx-local и стенд должны работать в одном Docker-контексте |
| Env | `.env` (не коммитится), образец `.env.example` |

В dev Payload сам синхронизирует схему БД (push). Для прода: `npm run payload migrate:create <имя>` → коммит миграций → `npm run payload migrate`.

## Команды

| Цель | Команда |
|---|---|
| Типы | `npm run typecheck` |
| Lint | `npm run lint` (адресно: `npx eslint <пути>`) |
| Типы Payload после изменения схемы | `npm run generate:types` |
| importMap после кастомных компонентов админки | `npm run generate:importmap` |
| Сборка | `npm run build` |
| Скриншоты | `node scripts/shoot.mjs http://localhost:43127 screenshots/<задача> [routes…]` |
| Прототип для сравнения | `git show prototype-final:<путь>` или https://zevsprotect-prototype.vercel.app |
| Доска | `bun docs/workflow/wf.mjs <get\|add\|set\|list\|lint\|audit-quick>` |

Тесты: `npm test` (Vitest, `lib/**/*.test.ts`, `payload/*.test.ts`), `npm run test:e2e` (Playwright, `e2e/`), `npm run typecheck`.

## Интеграции

- 1С КА 2 — CommerceML 2, протокол «Обмен с сайтом». Тестовые XML-пакеты хранить в `lib/onec/__fixtures__/`.
- Битрикс24 — REST через входящий вебхук (`B24_WEBHOOK_URL` в env), методы `crm.company.add`, `crm.contact.add`, `crm.deal.add`, `crm.deal.productrows.set`, `crm.lead.add`, `crm.deal.get`. Исходящий вебхук — `ONCRMDEALUPDATE`.
- Оплата — провайдер выбирается (BIZ-4), по умолчанию ЮKassa; в прототипе мок `/pay/[id]`.
Без тестовых учёток — только моки и unit-тесты маппинга; live-проверка остаётся открытым критерием карточки.
