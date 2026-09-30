# zevsprotect® — корпоративный сайт

Новый сайт бренда **зевспротект®** (замена [zevsprotect.ru](https://zevsprotect.ru/)).

Слоган бренда: **Сила в ваших руках.**

## Что это

Сайт на Next.js + Payload CMS 3 + PostgreSQL: витрина, каталог, заказы, личный кабинет, блог, админка `/admin`, обмен с 1С КА 2 и Битрикс24. Требования — [docs/TZ.md](docs/TZ.md), архитектура — [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (там же **реестр оставшихся моков**), правила работы — [AGENTS.md](AGENTS.md).

## Запуск

```bash
docker compose up -d        # PostgreSQL (порт 5442) и mailpit (письма: http://localhost:43126)
npm install
npm run seed                # начальные данные
npm run dev                 # http://localhost:43127, админка /admin
```

Всё в Docker, включая приложение: `make local-up` → http://zevs.test или http://zevs.localhost (через общий nginx-local) или http://localhost:43128. Остальные команды — `make help`.

Проверки: `npm test`, `npm run typecheck`, `npm run lint`, `npm run test:e2e`.

Прайс CSV: `/api/pricelist`.

## Дизайн

Брендбук: тёмно-синий `#040040`, белый, чёрный. Знак-молния + wordmark `zevsprotect` / `зевспротект`, слоган «Сила в ваших руках». Малиновый `#B4003C` — бренд `зевстекс®`, на этом сайте не ведущий. Логотипы лежат в `public/brand/`, текстовые константы — в `lib/brand.ts`.
