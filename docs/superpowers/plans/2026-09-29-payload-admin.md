# Админка Payload и модели данных — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собрать в Payload все коллекции и глобалы с ролями/доступами и привести `/admin` к макету (тема, навигация, дашборд).

**Architecture:** Один Next.js + Payload 3.90.2 (уже встроен). Чистая логика (access, хуки, валидаторы) лежит в отдельных файлах без обращения к БД и покрыта vitest; коллекции только собирают её в конфиг. UI — тема на переменных Payload + два серверных компонента (`AdminNav`, `Dashboard`).

**Tech Stack:** Payload 3.90.2, `@payloadcms/plugin-seo` 3.90.2, PostgreSQL 16, Next 16.3.5, React 19, vitest.

**Spec:** [docs/superpowers/specs/2026-09-29-payload-admin-design.md](../specs/2026-09-29-payload-admin-design.md)

## Global Constraints

- Ответы, комментарии, сообщения коммитов — по-русски; идентификаторы — как в коде (английский).
- Коммит заканчивать строкой `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Коммитить только файлы своей задачи, не `git add -A`.
- Payload API не выдумывать: сверяться с `.claude/skills/payload/SKILL.md` и типами в `node_modules/payload/dist`. Next 16 отличается от известного — перед правкой Next-кода читать `node_modules/next/dist/docs/`.
- Подагентам **нельзя** seed, запись в БД, миграции, `generate:*`, `next build`. Разрешены: чтение, `npx vitest run <файл>`, `npx tsc --noEmit -p .` (ошибки только в своих файлах).
- Деньги: рубли с копейками, округление `Math.round((n + Number.EPSILON) * 100) / 100`; цену и итог всегда пересчитывает сервер. Предположений про НДС/скидки не делать (BIZ-8).
- Не упоминать год основания; мессенджер только MAX (WhatsApp/Telegram не заводить).
- Слаги категорий ровно: `mehanika holod zhar mbs himiya kragi rukavitsy`.
- `admin.group` строго из набора: `Каталог`, `Контент`, `Продажи`, `Система`.
- Роли: `admin | manager | content`; клиент — коллекция `customers`. Проверка «сотрудник» = `user.collection === 'users'`.
- Витрина читает только `_status = published`.

## Review Focus

1. Заказ с пустым `items`, `qty ≤ 0`, отрицательной ценой — итог не должен стать отрицательным/NaN; `qty` и `price` имеют `min`. Тест — Task 2.
2. Заказ без клиента и без контактов гостя — валидатор отклоняет. Тест — Task 2.
3. Клиент читает чужой заказ / правит статус своего — access отказывает. Тест — Task 0 (матрица) и Task 2.
4. Повторный импорт товара с `manualOverride=true` и с частично отсутствующими полями — защищённые поля не затираются, не-защищённые обновляются. Тест — Task 1.
5. Пользователь `content` открывает дашборд — счётчики недоступных коллекций скрыты, страница не падает. Тест — Task 4 (`visibleGroups`).

---

## Карта файлов

```
payload/access.ts                     Task 0  права: хелперы
payload/access.test.ts                Task 0
payload/validators.ts                 Task 0  ИНН, класс вязки
payload/validators.test.ts            Task 0
payload/collections/Users.ts          Task 0  + role, первый пользователь = admin
payload/collections/Categories.ts     Task 1
payload/collections/Media.ts          Task 1
payload/collections/Products.ts       Task 1
payload/collections/Reviews.ts        Task 1
payload/hooks/products.ts (+test)     Task 1  protectFromImport, isPriceLocked
payload/hooks/media.ts (+test)        Task 1  kindFromMime
payload/collections/Customers.ts      Task 2
payload/collections/Orders.ts         Task 2
payload/collections/Leads.ts          Task 2
payload/hooks/orders.ts (+test)       Task 2  computeTotal, formatOrderNumber, nextStatusHistory
payload/collections/PostCategories.ts Task 3
payload/collections/Posts.ts          Task 3
payload/collections/Pages.ts          Task 3
payload/globals/{Home,About,Delivery,Navigation,Settings}.ts  Task 3
app/(payload)/custom.scss             Task 4
payload/components/nav-config.ts (+test)  Task 4
payload/components/AdminNav.tsx       Task 4
payload/components/Dashboard.tsx      Task 4
payload.config.ts                     Task 0 (i18n уже есть) и Task 5 (регистрация)
```

---

### Task 0: Фундамент (основной агент, до подагентов)

**Files:**
- Modify: `package.json` (devDependency `vitest`, скрипт `test`; dependency `@payloadcms/plugin-seo`)
- Create: `vitest.config.ts`, `payload/access.ts`, `payload/access.test.ts`, `payload/validators.ts`, `payload/validators.test.ts`
- Modify: `payload/collections/Users.ts`

**Interfaces:**
- Produces (`payload/access.ts`): `type Role = 'admin' | 'manager' | 'content'`; `isStaff`, `isAdmin`: `Access`; `hasRole(...roles: Role[]): Access`; `publishedOrStaff: Access`; `ownOrRoles(field: string, ...roles: Role[]): Access`; `selfOrAdmin: Access`.
- Produces (`payload/validators.ts`): `validateInn(kind?: 'person' | 'legal'): (v: string | null | undefined) => true | string`; `validateKnitClass(v: string | null | undefined): true | string`.

- [ ] **Step 1: Установить зависимости**

```bash
npm i -D vitest
npm i --save-exact @payloadcms/plugin-seo@3.90.2
```

В `package.json` добавить в `scripts`: `"test": "vitest run"`.

- [ ] **Step 2: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: { include: ['payload/**/*.test.ts', 'lib/**/*.test.ts'], environment: 'node' },
})
```

- [ ] **Step 3: Написать падающий тест `payload/access.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { hasRole, isAdmin, ownOrRoles, publishedOrStaff, selfOrAdmin } from './access'

const as = (user: unknown) => ({ req: { user } }) as never
const staff = (role: string, id = 1) => ({ collection: 'users', role, id })
const customer = (id = 7) => ({ collection: 'customers', id })

describe('access', () => {
  it('isAdmin: только admin', () => {
    expect(isAdmin(as(staff('admin')))).toBe(true)
    expect(isAdmin(as(staff('manager')))).toBe(false)
    expect(isAdmin(as(customer()))).toBe(false)
    expect(isAdmin(as(null))).toBe(false)
  })

  it('hasRole: клиент с полем role не считается сотрудником', () => {
    expect(hasRole('manager')(as({ collection: 'customers', role: 'manager' }))).toBe(false)
    expect(hasRole('manager', 'admin')(as(staff('manager')))).toBe(true)
    expect(hasRole('manager')(as(staff('content')))).toBe(false)
  })

  it('publishedOrStaff: аноним и клиент видят только опубликованное', () => {
    const where = { _status: { equals: 'published' } }
    expect(publishedOrStaff(as(null))).toEqual(where)
    expect(publishedOrStaff(as(customer()))).toEqual(where)
    expect(publishedOrStaff(as(staff('content')))).toBe(true)
  })

  it('ownOrRoles: заказы — admin/manager всё, клиент своё, content и аноним ничего', () => {
    const orders = ownOrRoles('customer', 'admin', 'manager')
    expect(orders(as(staff('manager')))).toBe(true)
    expect(orders(as(customer(7)))).toEqual({ customer: { equals: 7 } })
    expect(orders(as(staff('content')))).toBe(false)
    expect(orders(as(null))).toBe(false)
  })

  it('selfOrAdmin: остальные сотрудники читают только себя', () => {
    expect(selfOrAdmin(as(staff('admin')))).toBe(true)
    expect(selfOrAdmin(as(staff('content', 5)))).toEqual({ id: { equals: 5 } })
    expect(selfOrAdmin(as(customer()))).toBe(false)
  })
})
```

- [ ] **Step 4: Запустить — должен упасть**

Run: `npx vitest run payload/access.test.ts`
Expected: FAIL (`Failed to resolve import "./access"`).

- [ ] **Step 5: Реализовать `payload/access.ts`**

```ts
import type { Access } from 'payload'

export type Role = 'admin' | 'manager' | 'content'

type Actor = { collection?: string; role?: Role; id?: string | number } | null | undefined

const actor = (req: { user?: unknown }) => req.user as Actor

export const isStaff: Access = ({ req }) => actor(req)?.collection === 'users'

export const isAdmin: Access = ({ req }) => {
  const u = actor(req)
  return u?.collection === 'users' && u.role === 'admin'
}

export const hasRole =
  (...roles: Role[]): Access =>
  ({ req }) => {
    const u = actor(req)
    return u?.collection === 'users' && !!u.role && roles.includes(u.role)
  }

/** Сотрудник видит всё, остальные — только опубликованное. */
export const publishedOrStaff: Access = ({ req }) =>
  actor(req)?.collection === 'users' ? true : { _status: { equals: 'published' } }

/** Роли из списка видят всё; клиент — только документы, где `field` = его id; остальные — ничего. */
export const ownOrRoles =
  (field: string, ...roles: Role[]): Access =>
  (args) => {
    if (hasRole(...roles)(args)) return true
    const u = actor(args.req)
    if (u?.collection === 'customers' && u.id != null) return { [field]: { equals: u.id } }
    return false
  }

/** Admin видит всех пользователей, остальные сотрудники — только себя. */
export const selfOrAdmin: Access = (args) => {
  if (isAdmin(args)) return true
  const u = actor(args.req)
  return u?.collection === 'users' && u.id != null ? { id: { equals: u.id } } : false
}
```

- [ ] **Step 6: Тест проходит**

Run: `npx vitest run payload/access.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Тест валидаторов `payload/validators.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { validateInn, validateKnitClass } from './validators'

describe('validateInn', () => {
  it('пусто — допустимо (поле необязательное)', () => {
    expect(validateInn('legal')('')).toBe(true)
    expect(validateInn('legal')(undefined)).toBe(true)
  })
  it('legal — 10 цифр, person — 12', () => {
    expect(validateInn('legal')('6154123456')).toBe(true)
    expect(typeof validateInn('legal')('615412345678')).toBe('string')
    expect(validateInn('person')('615412345678')).toBe(true)
    expect(typeof validateInn('person')('6154123456')).toBe('string')
  })
  it('буквы и пробелы отклоняются', () => {
    expect(typeof validateInn('legal')('61541234 6')).toBe('string')
    expect(typeof validateInn('legal')('abcdefghij')).toBe('string')
  })
  it('без kind — 10 или 12 цифр', () => {
    expect(validateInn()('6154123456')).toBe(true)
    expect(validateInn()('615412345678')).toBe(true)
    expect(typeof validateInn()('12345')).toBe('string')
  })
})

describe('validateKnitClass', () => {
  it('число 5–18', () => {
    for (const v of ['5', '13', '18']) expect(validateKnitClass(v)).toBe(true)
    for (const v of ['4', '19', 'abc', '7.5']) expect(typeof validateKnitClass(v)).toBe('string')
  })
  it('пусто допустимо', () => expect(validateKnitClass('')).toBe(true))
})
```

- [ ] **Step 8: Запустить — падает; реализовать `payload/validators.ts`**

Run: `npx vitest run payload/validators.test.ts` → FAIL (нет модуля).

```ts
export const validateInn =
  (kind?: 'person' | 'legal') =>
  (v: string | null | undefined): true | string => {
    if (!v) return true
    const len = kind === 'legal' ? [10] : kind === 'person' ? [12] : [10, 12]
    return /^\d+$/.test(v) && len.includes(v.length)
      ? true
      : `ИНН — ${len.join(' или ')} цифр без пробелов`
  }

export const validateKnitClass = (v: string | null | undefined): true | string => {
  if (!v) return true
  return /^\d+$/.test(v) && +v >= 5 && +v <= 18 ? true : 'Класс вязки — целое число от 5 до 18'
}
```

Run: `npx vitest run payload/validators.test.ts` → PASS.

- [ ] **Step 9: `payload/collections/Users.ts` — роль и первый пользователь = admin**

```ts
import type { CollectionConfig } from 'payload'
import { isAdmin, selfOrAdmin } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Пользователь', plural: 'Пользователи' },
  admin: { useAsTitle: 'email', group: 'Система', defaultColumns: ['email', 'name', 'role'] },
  auth: true,
  access: {
    read: selfOrAdmin,
    create: isAdmin,
    update: selfOrAdmin,
    delete: isAdmin,
    admin: ({ req }) => req.user?.collection === 'users',
  },
  hooks: {
    // Первый пользователь без роли остался бы без прав — делаем его admin.
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', req })
          if (totalDocs === 0) data.role = 'admin'
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', label: 'Имя' },
    {
      name: 'role',
      type: 'select',
      label: 'Роль',
      required: true,
      defaultValue: 'content',
      options: [
        { label: 'Администратор', value: 'admin' },
        { label: 'Менеджер', value: 'manager' },
        { label: 'Контент-менеджер', value: 'content' },
      ],
      access: { create: isAdmin, update: isAdmin },
    },
  ],
}
```

- [ ] **Step 10: Проверка и коммит**

Run: `npx vitest run` → PASS; `npx tsc --noEmit -p .` → без новых ошибок (типы `role` появятся после `generate:types` в Task 5; до тех пор возможны ошибки `user.role` — допустимо, `access.ts` использует собственный тип `Actor`).

```bash
git add package.json package-lock.json vitest.config.ts payload/access.ts payload/access.test.ts payload/validators.ts payload/validators.test.ts payload/collections/Users.ts
git commit -m "feat(cms): роли, access-хелперы и валидаторы (S-5)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Каталог — categories, media, products, reviews (подагент 1a)

**Files:**
- Create: `payload/hooks/products.ts`, `payload/hooks/products.test.ts`, `payload/hooks/media.ts`, `payload/hooks/media.test.ts`
- Create: `payload/collections/Categories.ts`, `Products.ts`, `Reviews.ts`
- Modify: `payload/collections/Media.ts`

**Interfaces:**
- Consumes: `hasRole`, `publishedOrStaff`, `isStaff` из `../access`; `validateKnitClass` из `../validators`.
- Produces: экспорты `Categories`, `Products`, `Reviews`, `Media` (`CollectionConfig`); `protectFromImport`, `isPriceLocked`, `PROTECTED_FIELDS` (`hooks/products`); `kindFromMime` (`hooks/media`).

- [ ] **Step 1: Тест `payload/hooks/products.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { isPriceLocked, protectFromImport } from './products'

const original = {
  manualOverride: true,
  title: 'Феникс (правка админа)',
  description: 'ручной текст',
  price: 710,
  stock: 420,
  gallery: [{ image: 1 }],
  guid1c: 'g-1',
  note: 'не защищено',
}

describe('protectFromImport', () => {
  it('импорт + manualOverride: защищённые поля остаются прежними', () => {
    const out = protectFromImport({ title: 'Из 1С', price: 1, stock: 2 }, original, { fromImport: true })
    expect(out.title).toBe('Феникс (правка админа)')
    expect(out.price).toBe(710)
    expect(out.stock).toBe(420)
  })
  it('поля, которых нет в данных импорта, тоже не теряются', () => {
    const out = protectFromImport({ guid1c: 'g-1' }, original, { fromImport: true })
    expect(out.description).toBe('ручной текст')
    expect(out.gallery).toEqual([{ image: 1 }])
  })
  it('не-защищённые поля импорт обновляет', () => {
    const out = protectFromImport({ note: 'новое' }, original, { fromImport: true })
    expect(out.note).toBe('новое')
  })
  it('без manualOverride импорт пишет всё', () => {
    const out = protectFromImport({ title: 'Из 1С' }, { ...original, manualOverride: false }, { fromImport: true })
    expect(out.title).toBe('Из 1С')
  })
  it('правка из админки (нет fromImport) ничего не блокирует', () => {
    const out = protectFromImport({ title: 'Новое имя' }, original, {})
    expect(out.title).toBe('Новое имя')
  })
  it('создание (нет originalDoc) — данные как есть', () => {
    expect(protectFromImport({ title: 'A' }, undefined, { fromImport: true })).toEqual({ title: 'A' })
  })
})

describe('isPriceLocked', () => {
  it('заблокировано только для товара из 1С без ручной правки', () => {
    expect(isPriceLocked({ guid1c: 'g', manualOverride: false })).toBe(true)
    expect(isPriceLocked({ guid1c: 'g', manualOverride: true })).toBe(false)
    expect(isPriceLocked({ manualOverride: false })).toBe(false)
    expect(isPriceLocked(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить — падает** (`npx vitest run payload/hooks/products.test.ts`).

- [ ] **Step 3: `payload/hooks/products.ts`**

```ts
export const PROTECTED_FIELDS = [
  'title',
  'description',
  'base',
  'coating',
  'coatingType',
  'colors',
  'sizes',
  'knitClass',
  'tex',
  'weight',
  'length',
  'specs',
  'gallery',
  'price',
  'stock',
  'unit',
] as const

type Doc = Record<string, unknown>

/** Импорт из 1С не перезаписывает поля товара, помеченного manualOverride. */
export function protectFromImport(
  data: Doc,
  originalDoc: Doc | undefined,
  context: { fromImport?: unknown },
): Doc {
  if (!context.fromImport || !originalDoc?.manualOverride) return data
  const out = { ...data }
  for (const f of PROTECTED_FIELDS) if (f in originalDoc) out[f] = originalDoc[f]
  return out
}

/** Цена/остаток приходят из 1С и правятся вручную только при manualOverride. */
export const isPriceLocked = (d: { guid1c?: unknown; manualOverride?: unknown } | undefined) =>
  Boolean(d?.guid1c) && !d?.manualOverride
```

Run → PASS.

- [ ] **Step 4: Тест и хук `kindFromMime`**

`payload/hooks/media.test.ts`:

```ts
import { expect, it } from 'vitest'
import { kindFromMime } from './media'

it('kindFromMime', () => {
  expect(kindFromMime('image/jpeg')).toBe('image')
  expect(kindFromMime('application/pdf')).toBe('doc')
  expect(kindFromMime(undefined)).toBe('doc')
})
```

`payload/hooks/media.ts`:

```ts
export const kindFromMime = (mime?: string | null): 'image' | 'doc' =>
  mime?.startsWith('image/') ? 'image' : 'doc'
```

Run: `npx vitest run payload/hooks` → PASS.

- [ ] **Step 5: `payload/collections/Media.ts`**

```ts
import type { CollectionConfig } from 'payload'
import { hasRole } from '../access'
import { kindFromMime } from '../hooks/media'

const MB = 1024 * 1024

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Файл', plural: 'Медиа' },
  admin: { group: 'Каталог', useAsTitle: 'title', defaultColumns: ['filename', 'title', 'kind', 'updatedAt'] },
  access: {
    read: () => true,
    create: hasRole('admin', 'content'),
    update: hasRole('admin', 'content'),
    delete: hasRole('admin', 'content'),
  },
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        data.kind = kindFromMime(req.file?.mimetype ?? data.mimeType)
        return data
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alt-текст',
      validate: (v: string | null | undefined, { data }: { data: { mimeType?: string } }) =>
        !data?.mimeType?.startsWith('image/') || !!v ? true : 'Alt-текст обязателен для изображений',
    },
    { name: 'title', type: 'text', label: 'Заголовок' },
    {
      name: 'kind',
      type: 'select',
      label: 'Тип',
      options: [
        { label: 'Изображение', value: 'image' },
        { label: 'Документ', value: 'doc' },
      ],
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
  upload: {
    focalPoint: true,
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    imageSizes: [
      { name: 'thumbnail', width: 300, height: 300 },
      { name: 'card', width: 600, height: 600 },
      { name: 'hero', width: 1200, height: 1200 },
    ],
    adminThumbnail: 'thumbnail',
  },
}
```

Ограничение размера (10 МБ изображения / 25 МБ документы) задаёт основной агент в Task 5 через `upload.limits` в `payload.config.ts` (`limits: { fileSize: 25 * MB }`); для изображений >10 МБ — валидатор ниже. Добавить в `hooks.beforeChange` Media перед `data.kind`:

```ts
        const size = req.file?.size ?? 0
        if (req.file?.mimetype?.startsWith('image/') && size > 10 * MB)
          throw new Error('Изображение больше 10 МБ')
```

- [ ] **Step 6: `payload/collections/Categories.ts`**

```ts
import type { CollectionConfig } from 'payload'
import { hasRole, publishedOrStaff } from '../access'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Категория', plural: 'Категории' },
  admin: { group: 'Каталог', useAsTitle: 'title', defaultColumns: ['title', 'slug', 'order'] },
  defaultSort: 'order',
  access: {
    read: () => true,
    create: hasRole('admin', 'content'),
    update: hasRole('admin', 'content'),
    delete: hasRole('admin'),
  },
  fields: [
    { name: 'title', type: 'text', label: 'Название', required: true },
    { name: 'slug', type: 'text', label: 'Slug', required: true, unique: true, index: true },
    { name: 'parent', type: 'relationship', relationTo: 'categories', label: 'Родитель' },
    { name: 'icon', type: 'text', label: 'Иконка (имя из прототипа)' },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Картинка' },
    { name: 'order', type: 'number', label: 'Порядок', defaultValue: 0 },
  ],
}
```

(`publishedOrStaff` в файле не нужен — убрать из импорта, если линтер ругается.)

- [ ] **Step 7: `payload/collections/Products.ts`**

```ts
import type { CollectionConfig } from 'payload'
import { hasRole, publishedOrStaff } from '../access'
import { isPriceLocked, protectFromImport } from '../hooks/products'
import { validateKnitClass } from '../validators'

const editablePrice = ({ data }: { data?: { guid1c?: unknown; manualOverride?: unknown } }) =>
  !isPriceLocked(data)

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Модель', plural: 'Модели' },
  admin: {
    group: 'Каталог',
    useAsTitle: 'title',
    defaultColumns: ['title', 'sku', 'category', 'price', '_status', 'updatedAt'],
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: publishedOrStaff,
    create: hasRole('admin', 'content'),
    update: hasRole('admin', 'content'),
    delete: hasRole('admin'),
  },
  hooks: {
    beforeChange: [({ data, originalDoc, context }) => protectFromImport(data, originalDoc, context) as typeof data],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Основное',
          fields: [
            { name: 'title', type: 'text', label: 'Название', required: true },
            { name: 'slug', type: 'text', label: 'Slug', required: true, unique: true, index: true },
            { name: 'sku', type: 'text', label: 'Артикул', required: true, unique: true, index: true },
            { name: 'category', type: 'relationship', relationTo: 'categories', label: 'Категория', required: true },
            { name: 'description', type: 'richText', label: 'Описание' },
          ],
        },
        {
          label: 'Характеристики',
          fields: [
            { name: 'base', type: 'text', label: 'Основа' },
            { name: 'coating', type: 'text', label: 'Покрытие' },
            { name: 'coatingType', type: 'text', label: 'Вид покрытия' },
            { name: 'colors', type: 'text', hasMany: true, label: 'Цвета' },
            { name: 'sizes', type: 'text', hasMany: true, label: 'Размеры' },
            { name: 'knitClass', type: 'text', label: 'Класс вязки', validate: validateKnitClass },
            { name: 'tex', type: 'text', label: 'ТЕКС' },
            { name: 'weight', type: 'text', label: 'Вес пары' },
            { name: 'length', type: 'text', label: 'Длина модели' },
            {
              name: 'specs',
              type: 'array',
              label: 'Характеристики (свободные)',
              fields: [
                { name: 'key', type: 'text', label: 'Название', required: true },
                { name: 'value', type: 'text', label: 'Значение', required: true },
              ],
            },
          ],
        },
        {
          label: 'Фото и документы',
          fields: [
            {
              name: 'gallery',
              type: 'array',
              label: 'Галерея (первое фото — главное)',
              fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
            },
            {
              name: 'documents',
              type: 'array',
              label: 'Документы (декларации)',
              fields: [
                { name: 'title', type: 'text', label: 'Название', required: true },
                { name: 'file', type: 'upload', relationTo: 'media', required: true },
              ],
            },
          ],
        },
        {
          label: 'Цена и остатки',
          description: 'Данные из 1С. Правятся вручную только при включённом «Ручное управление».',
          fields: [
            { name: 'price', type: 'number', label: 'Цена за единицу, ₽', min: 0, access: { update: editablePrice } },
            { name: 'stock', type: 'number', label: 'В наличии', min: 0, access: { update: editablePrice } },
            { name: 'unit', type: 'text', label: 'Единица', defaultValue: 'пара', access: { update: editablePrice } },
            { name: 'minQty', type: 'number', label: 'Минимальный заказ', defaultValue: 50, min: 1 },
            { name: 'packSizes', type: 'number', hasMany: true, label: 'Кратность упаковки' },
          ],
        },
      ],
    },
    {
      name: 'badges',
      type: 'select',
      hasMany: true,
      label: 'Метки на карточке',
      options: [
        { label: 'Хит', value: 'hit' },
        { label: 'Новинка', value: 'new' },
        { label: 'Акция', value: 'sale' },
        { label: 'Избранное на главной', value: 'home' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'guid1c', type: 'text', label: 'GUID 1С', unique: true, index: true, admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'manualOverride',
      type: 'checkbox',
      label: 'Ручное управление (не перезаписывать из 1С)',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    { name: 'related', type: 'relationship', relationTo: 'products', hasMany: true, label: 'Похожие модели', admin: { position: 'sidebar' } },
  ],
}
```

Примечание: `guid1c` с `unique: true` допускает несколько `NULL` в Postgres — товары без 1С создаются свободно.

- [ ] **Step 8: `payload/collections/Reviews.ts`**

```ts
import type { CollectionConfig } from 'payload'
import { hasRole } from '../access'

const moderators = hasRole('admin', 'manager')

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  labels: { singular: 'Отзыв', plural: 'Отзывы' },
  admin: { group: 'Каталог', useAsTitle: 'authorName', defaultColumns: ['authorName', 'product', 'rating', 'approved', 'createdAt'] },
  access: {
    read: (args) => (moderators(args) ? true : { approved: { equals: true } }),
    create: ({ req }) => ['users', 'customers'].includes(String(req.user?.collection)),
    update: moderators,
    delete: moderators,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === 'create' && req.user?.collection === 'customers') data.customer = req.user.id
        return data
      },
    ],
  },
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', label: 'Модель', required: true },
    { name: 'authorName', type: 'text', label: 'Автор', required: true },
    { name: 'company', type: 'text', label: 'Компания' },
    { name: 'city', type: 'text', label: 'Город' },
    { name: 'rating', type: 'number', label: 'Оценка', required: true, min: 1, max: 5 },
    { name: 'text', type: 'textarea', label: 'Текст', required: true },
    { name: 'customer', type: 'relationship', relationTo: 'customers', label: 'Клиент', admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'approved',
      type: 'checkbox',
      label: 'Одобрен',
      defaultValue: false,
      access: { create: moderators, update: moderators },
      admin: { position: 'sidebar' },
    },
  ],
}
```

- [ ] **Step 9: Проверка**

Run: `npx vitest run payload/hooks` → PASS; `npx tsc --noEmit -p . 2>&1 | grep -E "payload/(collections/(Categories|Products|Reviews|Media)|hooks)"` → пусто (ссылки на `customers` в типах появятся после Task 5 — ошибки только про `relationTo: 'customers'` допустимы).

- [ ] **Step 10: Коммит**

```bash
git add payload/hooks/products.ts payload/hooks/products.test.ts payload/hooks/media.ts payload/hooks/media.test.ts payload/collections/Categories.ts payload/collections/Products.ts payload/collections/Reviews.ts payload/collections/Media.ts
git commit -m "feat(cms): коллекции каталога — categories, products, media, reviews (C-CAT, C-REV)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Продажи — customers, orders, leads (подагент 1b)

**Files:**
- Create: `payload/hooks/orders.ts`, `payload/hooks/orders.test.ts`
- Create: `payload/collections/Customers.ts`, `Orders.ts`, `Leads.ts`

**Interfaces:**
- Consumes: `hasRole`, `isAdmin`, `ownOrRoles`, `isStaff` из `../access`; `validateInn` из `../validators`.
- Produces: `Customers`, `Orders`, `Leads` (`CollectionConfig`); `round2`, `computeTotal(items, deliveryCost)`, `formatOrderNumber(year, seq)`, `nextStatusHistory(prev, prevStatus, status, nowIso, note?)`, `hasCustomerOrGuest(data)` (`hooks/orders`).

- [ ] **Step 1: Тест `payload/hooks/orders.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { computeTotal, formatOrderNumber, hasCustomerOrGuest, nextStatusHistory, round2 } from './orders'

describe('round2', () => {
  it('убирает хвост float', () => expect(round2(0.1 * 3)).toBe(0.3))
})

describe('computeTotal', () => {
  it('сумма позиций + доставка, копейки округляются', () => {
    expect(computeTotal([{ price: 18.4, qty: 10000 }], 0)).toBe(184000)
    expect(computeTotal([{ price: 0.1, qty: 3 }], 0)).toBe(0.3)
    expect(computeTotal([{ price: 710, qty: 500 }, { price: 500, qty: 300 }], 1500)).toBe(506500)
  })
  it('пусто / undefined — только доставка, не NaN', () => {
    expect(computeTotal([], 0)).toBe(0)
    expect(computeTotal(undefined, undefined)).toBe(0)
    expect(computeTotal([], 250)).toBe(250)
  })
  it('мусорные значения не дают отрицательный итог и NaN', () => {
    expect(computeTotal([{ price: -5, qty: 2 }], 0)).toBe(0)
    expect(computeTotal([{ price: 10, qty: 0 }], 0)).toBe(0)
    expect(computeTotal([{ price: Number.NaN, qty: 2 }], 0)).toBe(0)
  })
})

describe('formatOrderNumber', () => {
  it('ZP-YYYY-NNNN', () => {
    expect(formatOrderNumber(2026, 418)).toBe('ZP-2026-0418')
    expect(formatOrderNumber(2026, 12345)).toBe('ZP-2026-12345')
  })
})

describe('nextStatusHistory', () => {
  const now = '2026-09-29T10:00:00.000Z'
  it('создание: первая запись', () => {
    expect(nextStatusHistory(undefined, undefined, 'accepted', now)).toEqual([{ at: now, status: 'accepted' }])
  })
  it('смена статуса дописывает запись, старые сохраняются', () => {
    const prev = [{ at: '2026-09-28T09:00:00.000Z', status: 'accepted' }]
    const out = nextStatusHistory(prev, 'accepted', 'picking', now, 'собираем')
    expect(out).toHaveLength(2)
    expect(out[1]).toEqual({ at: now, status: 'picking', note: 'собираем' })
  })
  it('тот же статус — история без изменений (повторное сохранение)', () => {
    const prev = [{ at: now, status: 'accepted' }]
    expect(nextStatusHistory(prev, 'accepted', 'accepted', now)).toEqual(prev)
  })
})

describe('hasCustomerOrGuest', () => {
  it('нужен клиент или телефон гостя', () => {
    expect(hasCustomerOrGuest({ customer: 5 })).toBe(true)
    expect(hasCustomerOrGuest({ guest: { phone: '+79001112233' } })).toBe(true)
    expect(hasCustomerOrGuest({})).toBe(false)
    expect(hasCustomerOrGuest({ guest: { name: 'Иван' } })).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить — падает.** `npx vitest run payload/hooks/orders.test.ts`

- [ ] **Step 3: `payload/hooks/orders.ts`**

```ts
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

type Line = { price?: number | null; qty?: number | null }

const safe = (n: number | null | undefined) => (Number.isFinite(n) && (n as number) > 0 ? (n as number) : 0)

export function computeTotal(items: Line[] | undefined, deliveryCost: number | null | undefined): number {
  const lines = (items ?? []).reduce((s, i) => s + round2(safe(i.price) * safe(i.qty)), 0)
  return round2(lines + safe(deliveryCost))
}

export const formatOrderNumber = (year: number, seq: number) =>
  `ZP-${year}-${String(seq).padStart(4, '0')}`

export type HistoryEntry = { at: string; status: string; note?: string }

export function nextStatusHistory(
  prev: HistoryEntry[] | undefined,
  prevStatus: string | undefined,
  status: string,
  nowIso: string,
  note?: string,
): HistoryEntry[] {
  const history = prev ?? []
  if (prevStatus === status && history.length) return history
  return [...history, note ? { at: nowIso, status, note } : { at: nowIso, status }]
}

export const hasCustomerOrGuest = (d: { customer?: unknown; guest?: { phone?: string } }) =>
  Boolean(d.customer) || Boolean(d.guest?.phone)
```

Run → PASS.

- [ ] **Step 4: `payload/collections/Customers.ts`**

```ts
import type { CollectionConfig } from 'payload'
import { hasRole, isAdmin } from '../access'
import { validateInn } from '../validators'

const staffRead = hasRole('admin', 'manager')

export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Клиент', plural: 'Клиенты' },
  admin: { group: 'Продажи', useAsTitle: 'email', defaultColumns: ['name', 'email', 'phone', 'company', 'kind'] },
  auth: true,
  access: {
    read: (args) => {
      if (staffRead(args)) return true
      const u = args.req.user
      return u?.collection === 'customers' ? { id: { equals: u.id } } : false
    },
    create: () => true, // регистрация
    update: (args) => {
      if (staffRead(args)) return true
      const u = args.req.user
      return u?.collection === 'customers' ? { id: { equals: u.id } } : false
    },
    delete: isAdmin,
    admin: () => false,
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      label: 'Тип',
      defaultValue: 'person',
      options: [
        { label: 'Частное лицо', value: 'person' },
        { label: 'Юридическое лицо', value: 'legal' },
      ],
    },
    { name: 'name', type: 'text', label: 'ФИО / контактное лицо', required: true },
    { name: 'phone', type: 'text', label: 'Телефон', required: true },
    { name: 'company', type: 'text', label: 'Организация' },
    {
      name: 'inn',
      type: 'text',
      label: 'ИНН',
      validate: (v: string | null | undefined, { siblingData }: { siblingData: { kind?: 'person' | 'legal' } }) =>
        validateInn(siblingData?.kind === 'legal' ? 'legal' : siblingData?.kind === 'person' ? 'person' : undefined)(v),
    },
    { name: 'kpp', type: 'text', label: 'КПП' },
    { name: 'address', type: 'text', label: 'Юридический адрес' },
    {
      name: 'addresses',
      type: 'array',
      label: 'Адреса доставки',
      fields: [
        { name: 'label', type: 'text', label: 'Название', required: true },
        { name: 'city', type: 'text', label: 'Город', required: true },
        { name: 'line', type: 'text', label: 'Адрес', required: true },
        { name: 'phone', type: 'text', label: 'Телефон' },
        { name: 'isDefault', type: 'checkbox', label: 'По умолчанию' },
      ],
    },
    { name: 'bankName', type: 'text', label: 'Банк' },
    { name: 'bankAccount', type: 'text', label: 'Расчётный счёт' },
    { name: 'bik', type: 'text', label: 'БИК' },
    {
      name: 'authProvider',
      type: 'select',
      label: 'Способ входа',
      defaultValue: 'password',
      options: [
        { label: 'Пароль', value: 'password' },
        { label: 'Телефон', value: 'phone' },
        { label: 'Яндекс ID', value: 'yandex' },
      ],
    },
    { name: 'yandexId', type: 'text', label: 'Yandex ID', index: true },
    { name: 'favorites', type: 'relationship', relationTo: 'products', hasMany: true, label: 'Избранное' },
    { name: 'consentPdAt', type: 'date', label: 'Согласие на обработку ПДн', admin: { readOnly: true } },
    ...['b24CompanyId', 'b24ContactId', 'onecId', 'syncError'].map((name) => ({
      name,
      type: 'text' as const,
      label: name,
      access: { create: isAdmin, update: isAdmin },
      admin: { position: 'sidebar' as const, readOnly: true },
    })),
  ],
}
```

- [ ] **Step 5: `payload/collections/Orders.ts`**

```ts
import type { CollectionConfig } from 'payload'
import { hasRole, isAdmin, ownOrRoles } from '../access'
import { computeTotal, formatOrderNumber, hasCustomerOrGuest, nextStatusHistory } from '../hooks/orders'

const manager = hasRole('admin', 'manager')
const syncField = (name: string, label: string) => ({
  name,
  type: 'text' as const,
  label,
  access: { create: isAdmin, update: isAdmin },
  admin: { position: 'sidebar' as const, readOnly: true },
})

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Заказ', plural: 'Заказы' },
  admin: {
    group: 'Продажи',
    useAsTitle: 'number',
    defaultColumns: ['number', 'customer', 'total', 'status', 'paymentStatus', 'createdAt'],
    listSearchableFields: ['number', 'guest.name', 'guest.phone'],
  },
  defaultSort: '-createdAt',
  access: {
    read: ownOrRoles('customer', 'admin', 'manager'),
    create: manager, // заказы витрины создаёт серверный код с overrideAccess
    update: manager,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && data && !data.number) {
          const year = new Date().getFullYear()
          const { totalDocs } = await req.payload.count({
            collection: 'orders',
            where: { number: { like: `ZP-${year}-` } },
            req,
          })
          // ponytail: count+1 — при гонке unique-индекс вернёт ошибку, вызывающий повторяет; счётчик-sequence при нагрузке
          data.number = formatOrderNumber(year, totalDocs + 1)
        }
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc }) => {
        data.total = computeTotal(data.items ?? originalDoc?.items, data.delivery?.cost ?? originalDoc?.delivery?.cost)
        const status = data.status ?? originalDoc?.status
        if (status)
          data.statusHistory = nextStatusHistory(originalDoc?.statusHistory, originalDoc?.status, status, new Date().toISOString())
        return data
      },
    ],
  },
  fields: [
    { name: 'number', type: 'text', label: 'Номер', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'customer', type: 'relationship', relationTo: 'customers', label: 'Клиент' },
    {
      name: 'guest',
      type: 'group',
      label: 'Гость (без регистрации)',
      fields: [
        { name: 'name', type: 'text', label: 'Имя' },
        {
          name: 'phone',
          type: 'text',
          label: 'Телефон',
          validate: (v: string | null | undefined, { data }: { data: { customer?: unknown } }) =>
            hasCustomerOrGuest({ customer: data?.customer, guest: { phone: v ?? undefined } })
              ? true
              : 'Укажите клиента или телефон гостя',
        },
        { name: 'email', type: 'email', label: 'Email' },
        { name: 'company', type: 'text', label: 'Компания' },
        { name: 'inn', type: 'text', label: 'ИНН' },
      ],
    },
    {
      name: 'items',
      type: 'array',
      label: 'Состав (снапшот)',
      required: true,
      minRows: 1,
      fields: [
        { name: 'product', type: 'relationship', relationTo: 'products', label: 'Модель' },
        { name: 'sku', type: 'text', label: 'Артикул' },
        { name: 'title', type: 'text', label: 'Название', required: true },
        { name: 'size', type: 'text', label: 'Размер' },
        { name: 'coating', type: 'text', label: 'Покрытие' },
        { name: 'price', type: 'number', label: 'Цена, ₽', required: true, min: 0 },
        { name: 'qty', type: 'number', label: 'Кол-во', required: true, min: 1 },
      ],
    },
    { name: 'total', type: 'number', label: 'Итого, ₽', admin: { readOnly: true } },
    {
      name: 'delivery',
      type: 'group',
      label: 'Доставка',
      fields: [
        { name: 'city', type: 'text', label: 'Город' },
        {
          name: 'carrier',
          type: 'select',
          label: 'Способ',
          options: [
            { label: 'СДЭК', value: 'cdek' },
            { label: 'Терминал ТК', value: 'terminal' },
            { label: 'Самовывоз', value: 'pickup' },
          ],
        },
        { name: 'carrierName', type: 'text', label: 'Перевозчик' },
        { name: 'cost', type: 'number', label: 'Стоимость, ₽', min: 0 },
        { name: 'address', type: 'text', label: 'Адрес' },
      ],
    },
    { name: 'comment', type: 'textarea', label: 'Комментарий' },
    {
      name: 'paymentMethod',
      type: 'select',
      label: 'Оплата',
      required: true,
      options: [
        { label: 'Счёт (авто)', value: 'invoice_auto' },
        { label: 'Счёт (менеджер)', value: 'invoice_manager' },
        { label: 'Онлайн', value: 'online' },
      ],
    },
    {
      name: 'paymentStatus',
      type: 'select',
      label: 'Статус оплаты',
      defaultValue: 'pending',
      options: [
        { label: 'Ожидает', value: 'pending' },
        { label: 'Счёт выставлен', value: 'invoiced' },
        { label: 'Оплачен', value: 'paid' },
        { label: 'Ошибка', value: 'failed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Статус',
      defaultValue: 'accepted',
      required: true,
      options: [
        { label: 'Принят', value: 'accepted' },
        { label: 'Комплектуется', value: 'picking' },
        { label: 'Отгружен', value: 'shipped' },
        { label: 'В доставке', value: 'delivery' },
        { label: 'Доставлен', value: 'delivered' },
        { label: 'Отменён', value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'statusHistory',
      type: 'array',
      label: 'История статусов',
      access: { create: () => false, update: () => false },
      admin: { readOnly: true },
      fields: [
        { name: 'at', type: 'date', label: 'Когда', admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'status', type: 'text', label: 'Статус' },
        { name: 'note', type: 'text', label: 'Комментарий' },
      ],
    },
    { name: 'consentPdAt', type: 'date', label: 'Согласие на ПДн', admin: { readOnly: true } },
    { name: 'paymentId', type: 'text', label: 'ID платежа', unique: true, index: true, admin: { position: 'sidebar', readOnly: true } },
    { name: 'onecExportedAt', type: 'date', label: 'Выгружен в 1С', admin: { position: 'sidebar', readOnly: true } },
    syncField('b24DealId', 'ID сделки Б24'),
    syncField('syncError', 'Ошибка синхронизации'),
  ],
}
```

Кнопка «Отправить в Б24 повторно» — в этой задаче не делается (I-B24-DEAL); поле `syncError` уже есть.

- [ ] **Step 6: `payload/collections/Leads.ts`**

```ts
import type { CollectionConfig } from 'payload'
import { hasRole, isAdmin } from '../access'

const manager = hasRole('admin', 'manager')

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Заявка', plural: 'Заявки' },
  admin: { group: 'Продажи', useAsTitle: 'name', defaultColumns: ['type', 'name', 'phone', 'status', 'createdAt'] },
  defaultSort: '-createdAt',
  access: { read: manager, create: () => true, update: manager, delete: isAdmin },
  fields: [
    {
      name: 'type',
      type: 'select',
      label: 'Тип формы',
      required: true,
      options: [
        { label: 'Обратная связь', value: 'feedback' },
        { label: 'Расчёт поставки', value: 'calculation' },
        { label: 'Образцы', value: 'samples' },
        { label: 'Консультация', value: 'consultation' },
        { label: 'Запрос по товару', value: 'product-request' },
      ],
    },
    { name: 'name', type: 'text', label: 'Имя' },
    { name: 'phone', type: 'text', label: 'Телефон' },
    { name: 'email', type: 'email', label: 'Email' },
    { name: 'company', type: 'text', label: 'Компания' },
    { name: 'message', type: 'textarea', label: 'Сообщение' },
    { name: 'data', type: 'json', label: 'Остальные поля формы' },
    { name: 'consentPdAt', type: 'date', label: 'Согласие на ПДн', required: true },
    { name: 'sourceUrl', type: 'text', label: 'Страница' },
    {
      name: 'status',
      type: 'select',
      label: 'Статус',
      defaultValue: 'new',
      options: [
        { label: 'Новая', value: 'new' },
        { label: 'Обработана', value: 'processed' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'b24LeadId', type: 'text', label: 'ID лида Б24', access: { create: isAdmin, update: isAdmin }, admin: { position: 'sidebar', readOnly: true } },
    { name: 'syncError', type: 'text', label: 'Ошибка синхронизации', access: { create: isAdmin, update: isAdmin }, admin: { position: 'sidebar', readOnly: true } },
  ],
}
```

- [ ] **Step 7: Проверка.** `npx vitest run payload/hooks/orders.test.ts` → PASS; `npx tsc --noEmit -p . 2>&1 | grep -E "payload/(collections/(Customers|Orders|Leads)|hooks/orders)"` — допустимы только ошибки про ещё не сгенерированные типы.

- [ ] **Step 8: Коммит**

```bash
git add payload/hooks/orders.ts payload/hooks/orders.test.ts payload/collections/Customers.ts payload/collections/Orders.ts payload/collections/Leads.ts
git commit -m "feat(cms): коллекции продаж — customers, orders, leads (C-ORD, C-LEADS)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Контент — блог, страницы, глобалы (подагент 1c)

**Files:**
- Create: `payload/collections/PostCategories.ts`, `Posts.ts`, `Pages.ts`
- Create: `payload/globals/Home.ts`, `About.ts`, `Delivery.ts`, `Navigation.ts`, `Settings.ts`

**Interfaces:**
- Consumes: `hasRole`, `publishedOrStaff` из `../access`.
- Produces: `PostCategories`, `Posts`, `Pages` (`CollectionConfig`); `Home`, `About`, `Delivery`, `Navigation`, `Settings` (`GlobalConfig`).

- [ ] **Step 1: Общий helper прав контента** — в каждом файле (без нового модуля):

```ts
const editor = hasRole('admin', 'content')
```

- [ ] **Step 2: `PostCategories.ts`**

```ts
import type { CollectionConfig } from 'payload'
import { hasRole } from '../access'

const editor = hasRole('admin', 'content')

export const PostCategories: CollectionConfig = {
  slug: 'post-categories',
  labels: { singular: 'Рубрика блога', plural: 'Рубрики блога' },
  admin: { group: 'Контент', useAsTitle: 'title' },
  access: { read: () => true, create: editor, update: editor, delete: hasRole('admin') },
  fields: [
    { name: 'title', type: 'text', label: 'Название', required: true },
    { name: 'slug', type: 'text', label: 'Slug', required: true, unique: true, index: true },
  ],
}
```

- [ ] **Step 3: `Posts.ts`**

```ts
import type { CollectionConfig } from 'payload'
import { hasRole, publishedOrStaff } from '../access'

const editor = hasRole('admin', 'content')

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Статья', plural: 'Статьи' },
  admin: { group: 'Контент', useAsTitle: 'title', defaultColumns: ['title', 'category', 'publishedAt', '_status'] },
  defaultSort: '-publishedAt',
  versions: { drafts: true, maxPerDoc: 20 },
  access: { read: publishedOrStaff, create: editor, update: editor, delete: hasRole('admin') },
  fields: [
    { name: 'title', type: 'text', label: 'Заголовок', required: true },
    { name: 'slug', type: 'text', label: 'Slug', required: true, unique: true, index: true },
    { name: 'category', type: 'relationship', relationTo: 'post-categories', label: 'Рубрика' },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
      label: 'Обложка',
      admin: { description: 'На витрине показывается целиком (contain), без обрезки — загружайте в исходных пропорциях.' },
    },
    { name: 'excerpt', type: 'textarea', label: 'Анонс', required: true },
    { name: 'content', type: 'richText', label: 'Текст' },
    {
      name: 'slides',
      type: 'array',
      label: 'Слайды',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'title', type: 'text', label: 'Подпись' },
        { name: 'alt', type: 'text', label: 'Alt' },
      ],
    },
    { name: 'related', type: 'relationship', relationTo: 'posts', hasMany: true, label: 'Связанные статьи', admin: { position: 'sidebar' } },
    { name: 'publishedAt', type: 'date', label: 'Дата публикации', admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } } },
    { name: 'home', type: 'checkbox', label: 'Показывать на главной', defaultValue: false, admin: { position: 'sidebar' } },
  ],
}
```

- [ ] **Step 4: `Pages.ts`**

```ts
import type { CollectionConfig } from 'payload'
import { hasRole, publishedOrStaff } from '../access'

const editor = hasRole('admin', 'content')

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Страница', plural: 'Страницы' },
  admin: { group: 'Контент', useAsTitle: 'title', defaultColumns: ['title', 'slug', '_status', 'updatedAt'] },
  versions: { drafts: true, maxPerDoc: 20 },
  access: { read: publishedOrStaff, create: editor, update: editor, delete: hasRole('admin') },
  fields: [
    { name: 'title', type: 'text', label: 'Заголовок', required: true },
    { name: 'slug', type: 'text', label: 'Slug', required: true, unique: true, index: true },
    { name: 'content', type: 'richText', label: 'Содержимое' },
  ],
}
```

- [ ] **Step 5: Глобалы.** Общий вид: `access: { read: () => true, update: hasRole('admin', 'content') }`, `admin: { group: 'Контент' }`.

`Home.ts`:

```ts
import type { GlobalConfig } from 'payload'
import { hasRole } from '../access'

export const Home: GlobalConfig = {
  slug: 'home',
  label: 'Главная',
  admin: { group: 'Контент' },
  access: { read: () => true, update: hasRole('admin', 'content') },
  fields: [
    { name: 'heroTitle', type: 'text', label: 'Заголовок первого экрана' },
    { name: 'heroText', type: 'textarea', label: 'Подзаголовок' },
    { name: 'featuredProducts', type: 'relationship', relationTo: 'products', hasMany: true, label: 'Товары на главной' },
    { name: 'featuredPosts', type: 'relationship', relationTo: 'posts', hasMany: true, label: 'Статьи на главной' },
    {
      name: 'banners',
      type: 'array',
      label: 'Баннеры',
      fields: [
        { name: 'title', type: 'text', label: 'Заголовок', required: true },
        { name: 'text', type: 'textarea', label: 'Текст' },
        { name: 'image', type: 'upload', relationTo: 'media', label: 'Изображение' },
        { name: 'url', type: 'text', label: 'Ссылка' },
      ],
    },
  ],
}
```

`About.ts` (`slug: 'about'`, `label: 'О компании'`): поля `text` (richText), `documents` (array: `title` text*, `file` upload→media*; в подписи — «Декларации соответствия», слова «Протокол испытаний» не использовать), `workshopVideo` (upload→media, `label: 'Видео цеха'`).

`Delivery.ts` (`slug: 'delivery'`, `label: 'Доставка'`): `intro` (richText), `terms` (array: `title` text*, `text` textarea*).

`Navigation.ts` (`slug: 'navigation'`, `label: 'Меню'`): `header` и `footer` — array `{ label: text*, url: text* }`.

`Settings.ts`:

```ts
import type { GlobalConfig } from 'payload'
import { hasRole } from '../access'

const admin = hasRole('admin')

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Настройки',
  admin: { group: 'Контент' },
  access: { read: () => true, update: admin }, // публичны только контакты — реквизиты и b24StageMap закрыты полевым read
  fields: [
    {
      name: 'contacts',
      type: 'group',
      label: 'Контакты',
      fields: [
        { name: 'phone', type: 'text', label: 'Телефон' },
        { name: 'email', type: 'email', label: 'Email' },
        { name: 'address', type: 'text', label: 'Адрес' },
        { name: 'max', type: 'text', label: 'Ссылка на MAX' },
      ],
    },
    {
      name: 'requisites',
      type: 'group',
      label: 'Реквизиты для счёта',
      access: { read: hasRole('admin', 'manager') },
      fields: ['legalName', 'inn', 'kpp', 'ogrn', 'bankName', 'bankAccount', 'corrAccount', 'bik'].map((name) => ({
        name,
        type: 'text' as const,
        label: name,
      })),
    },
    {
      name: 'analytics',
      type: 'group',
      label: 'Счётчики',
      fields: [
        { name: 'yandexMetrika', type: 'text', label: 'ID Яндекс.Метрики' },
        { name: 'googleAnalytics', type: 'text', label: 'ID Google Analytics' },
      ],
    },
    {
      name: 'b24StageMap',
      type: 'array',
      label: 'Стадии Б24 → статус заказа',
      access: { read: hasRole('admin', 'manager') },
      fields: [
        { name: 'stage', type: 'text', label: 'Стадия сделки Б24', required: true },
        {
          name: 'status',
          type: 'select',
          label: 'Статус заказа',
          required: true,
          options: ['accepted', 'picking', 'shipped', 'delivery', 'delivered', 'cancelled'],
        },
      ],
    },
  ],
}
```

Подписи полей реквизитов заменить русскими (`Юр. название`, `ИНН`, `КПП`, `ОГРН`, `Банк`, `Расчётный счёт`, `Корр. счёт`, `БИК`) — для этого использовать массив `[name, label]` вместо строк.

- [ ] **Step 6: Проверка.** `npx tsc --noEmit -p . 2>&1 | grep -E "payload/(collections/(Post|Pages)|globals)"` → пусто.

- [ ] **Step 7: Коммит**

```bash
git add payload/collections/PostCategories.ts payload/collections/Posts.ts payload/collections/Pages.ts payload/globals
git commit -m "feat(cms): блог, страницы и глобалы (C-BLOG, C-CONTENT)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: UI — тема, навигация, дашборд (подагент 1d)

**Files:**
- Modify: `app/(payload)/custom.scss`
- Create: `payload/components/nav-config.ts`, `payload/components/nav-config.test.ts`, `payload/components/AdminNav.tsx`, `payload/components/Dashboard.tsx`

**Interfaces:**
- Consumes: только `import type { Role } from '../access'`.
- Produces: `NAV_GROUPS: NavGroup[]`, `visibleGroups(role: Role | undefined): NavGroup[]` (`nav-config`); `AdminNav` (server component, `ServerProps`); `Dashboard` (server component view). Пути в конфиге (регистрирует Task 5): `'/payload/components/AdminNav#AdminNav'`, `'/payload/components/Dashboard#Dashboard'`.

Тип: `type NavItem = { label: string; href: string; roles: Role[] }`, `type NavGroup = { title: string; items: NavItem[] }`. `href` — `/admin/collections/<slug>` или `/admin/globals/<slug>`.

- [ ] **Step 1: Тест `nav-config.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { NAV_GROUPS, visibleGroups } from './nav-config'

const labels = (role?: 'admin' | 'manager' | 'content') =>
  visibleGroups(role).flatMap((g) => g.items.map((i) => i.label))

describe('visibleGroups', () => {
  it('admin видит всё', () => {
    expect(visibleGroups('admin')).toHaveLength(NAV_GROUPS.length)
    expect(labels('admin')).toContain('Пользователи')
  })
  it('content: нет заказов, клиентов, заявок, пользователей', () => {
    const l = labels('content')
    for (const hidden of ['Заказы', 'Клиенты', 'Заявки', 'Пользователи']) expect(l).not.toContain(hidden)
    expect(l).toContain('Модели')
    expect(l).toContain('Статьи')
  })
  it('manager: заказы есть, правки каталога — нет (пункты каталога только для чтения видны)', () => {
    expect(labels('manager')).toContain('Заказы')
    expect(labels('manager')).not.toContain('Пользователи')
  })
  it('без роли (неизвестный пользователь) — пусто, без исключения', () => {
    expect(visibleGroups(undefined)).toEqual([])
  })
  it('пустые группы не возвращаются', () => {
    expect(visibleGroups('content').every((g) => g.items.length > 0)).toBe(true)
  })
})
```

- [ ] **Step 2: Падает.** Затем `nav-config.ts`:

```ts
import type { Role } from '../access'

export type NavItem = { label: string; href: string; roles: Role[] }
export type NavGroup = { title: string; items: NavItem[] }

const col = (slug: string) => `/admin/collections/${slug}`
const glob = (slug: string) => `/admin/globals/${slug}`
const ALL: Role[] = ['admin', 'manager', 'content']

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Каталог',
    items: [
      { label: 'Модели', href: col('products'), roles: ALL },
      { label: 'Категории', href: col('categories'), roles: ALL },
      { label: 'Медиа', href: col('media'), roles: ALL },
      { label: 'Отзывы', href: col('reviews'), roles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Контент',
    items: [
      { label: 'Статьи', href: col('posts'), roles: ALL },
      { label: 'Рубрики блога', href: col('post-categories'), roles: ALL },
      { label: 'Страницы', href: col('pages'), roles: ALL },
      { label: 'Меню', href: glob('navigation'), roles: ALL },
      { label: 'Главная', href: glob('home'), roles: ALL },
      { label: 'О компании', href: glob('about'), roles: ALL },
      { label: 'Доставка', href: glob('delivery'), roles: ALL },
      { label: 'Настройки', href: glob('settings'), roles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Продажи',
    items: [
      { label: 'Клиенты', href: col('customers'), roles: ['admin', 'manager'] },
      { label: 'Заказы', href: col('orders'), roles: ['admin', 'manager'] },
      { label: 'Заявки', href: col('leads'), roles: ['admin', 'manager'] },
    ],
  },
  { title: 'Система', items: [{ label: 'Пользователи', href: col('users'), roles: ['admin'] }] },
]

export function visibleGroups(role: Role | undefined): NavGroup[] {
  if (!role) return []
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter(
    (g) => g.items.length > 0,
  )
}
```

Run: `npx vitest run payload/components` → PASS. (Настройки: `content` не читает `requisites`, но сам глобал доступен — пункт для content скрыт намеренно, права на страницу проверяет Payload.)

- [ ] **Step 3: `custom.scss` — токены и маппинг на Payload.** Заменить содержимое `app/(payload)/custom.scss`. Токены — дословно из `html/zevs-cabinet-export/css/tokens.css` (обе темы, блоки `[data-theme='dark']` и `[data-theme='light']`; в Payload тема задаётся `html[data-theme]`). Затем маппинг:

```scss
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

html[data-theme='dark'] { /* ← блок :root,[data-theme=dark] из tokens.css без color-scheme дубля */ }
html[data-theme='light'] { /* ← блок [data-theme=light] из tokens.css */ }

html {
  --font-body: 'IBM Plex Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --theme-bg: var(--bg);
  --theme-input-bg: var(--surface);
  --theme-text: var(--text);
  --theme-elevation-0: var(--bg);
  --theme-elevation-50: var(--surface-2);
  --theme-elevation-100: var(--surface);
  --theme-elevation-150: var(--border);
  --theme-elevation-200: var(--border-strong);
  --theme-elevation-400: var(--text-3);
  --theme-elevation-600: var(--text-3);
  --theme-elevation-800: var(--text-2);
  --theme-elevation-1000: var(--text);
}

// Основные кнопки — акцент вместо инверсного цвета Payload.
.btn--style-primary {
  --bg-color: var(--accent);
  --color: var(--on-accent);
  --hover-bg: var(--accent);
}
a:focus-visible, button:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

Далее — классы навигации и дашборда `.zp-nav*`, `.zp-dash*` (см. `AdminNav.dc.html`, `AdminDashboard.dc.html`, `css/admin.css` макета: карточки-счётчики, список «Требует внимания», «Последние изменения», бренд, группы, пункт `aria-current`). Перенести из `css/admin.css` только используемые правила `zp-*`, заменив значения на токены.

**Проверка результата — в браузере** (см. Step 6). Привязка к внутренним классам Payload только для `.btn--style-primary`; остальное — через `--theme-*`.

- [ ] **Step 4: `AdminNav.tsx`**

```tsx
import type { ServerProps } from 'payload'
import Link from 'next/link'
import { visibleGroups } from './nav-config'

export function AdminNav({ user }: ServerProps) {
  const role = user?.collection === 'users' ? (user.role as 'admin' | 'manager' | 'content') : undefined
  const groups = visibleGroups(role)
  return (
    <nav className="zp-nav" aria-label="Разделы админки">
      <div className="zp-nav__brand">
        <span className="zp-nav__logo" aria-hidden="true">z</span>
        <div>
          <strong>зевспротект®</strong>
          <small>CMS · админка</small>
        </div>
      </div>
      {groups.map((g) => (
        <div key={g.title} className="zp-nav__group">
          <span className="zp-nav__title">{g.title.toUpperCase()}</span>
          {g.items.map((i) => (
            <Link key={i.href} href={i.href} className="zp-nav__item">
              {i.label}
            </Link>
          ))}
        </div>
      ))}
      <div className="zp-nav__footer">
        <a href="/" target="_blank" rel="noreferrer" className="zp-nav__item">Открыть сайт</a>
        {user && (
          <div className="zp-nav__user">
            <span>{(user.name as string) || user.email}</span>
            <small>{role}</small>
          </div>
        )}
      </div>
    </nav>
  )
}
```

Сверить сигнатуру `Nav`-компонента и наличие `user` в props по `.claude/skills/payload/reference/` и типам `payload` (`ServerProps`); при отличии подогнать, не выдумывать. Иконки пунктов (инлайн SVG из макета) — по желанию исполнителя, без новых зависимостей.

- [ ] **Step 5: `Dashboard.tsx`** (серверный компонент view)

Требования:
- Получить `payload`, `user` из props вида (`initPageResult.req.payload/user` — сверить с типом `AdminViewServerProps`).
- Счётчики `payload.count({ collection, user, overrideAccess: false })` для пунктов из `visibleGroups(role)`, у которых `href` — коллекция; каждый вызов в `try/catch` → при ошибке карточка скрывается (тест Review Focus №5).
- Блок «Требует внимания» (без сущностей, к которым нет доступа): черновики моделей (`products`, `_status = draft`), заказы с `paymentStatus = pending`, документы с `syncError exists` в `orders`/`leads`; строка = `{title, sub, href}`; пустой список → «Всё в порядке».
- «Последние изменения»: по 5 последних из `products`, `posts`, `pages` (`sort: '-updatedAt'`, `depth: 0`, `limit: 5`, `overrideAccess: false`, `user`), слить, отсортировать по `updatedAt`, взять 5; показать название, коллекцию, дату.
- Верстка на классах `.zp-dash*` из custom.scss; заголовок «Добро пожаловать, {имя}».

```tsx
import type { AdminViewServerProps } from 'payload'
import Link from 'next/link'
import { visibleGroups } from './nav-config'

async function safeCount(props: { payload: any; user: any; collection: string; where?: any }) {
  try {
    const { totalDocs } = await props.payload.count({
      collection: props.collection,
      where: props.where,
      user: props.user,
      overrideAccess: false,
    })
    return totalDocs as number
  } catch {
    return null
  }
}

export async function Dashboard({ initPageResult }: AdminViewServerProps) {
  const { payload, user } = initPageResult.req
  const role = user?.collection === 'users' ? (user.role as 'admin' | 'manager' | 'content') : undefined
  const groups = visibleGroups(role)
  // счётчики по коллекциям из nav-config
  const cards = await Promise.all(
    groups.map(async (g) => ({
      title: g.title,
      cards: (
        await Promise.all(
          g.items
            .filter((i) => i.href.startsWith('/admin/collections/'))
            .map(async (i) => ({
              ...i,
              count: await safeCount({ payload, user, collection: i.href.split('/').pop()! }),
            })),
        )
      ).filter((c) => c.count !== null),
    })),
  )
  // …блоки «Требует внимания» и «Последние изменения» по требованиям выше
  return (
    <div className="zp-dash">
      <h1>Добро пожаловать, {(user?.name as string) || user?.email}</h1>
      {cards.map((g) => (
        <section key={g.title}>
          <h2 className="zp-dash__title">{g.title.toUpperCase()}</h2>
          <div className="zp-dash__cards">
            {g.cards.map((c) => (
              <Link key={c.href} href={c.href} className="zp-dash__card">
                <span>{c.label}</span>
                <strong>{c.count}</strong>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

Исполнитель дописывает блоки «Требует внимания» и «Последние изменения» (структура — в требованиях; цвет точки статуса: `--pay` черновики/ожидает оплаты, `--err`/красный токен из `admin.css` — ошибки синхронизации, `--accent` — прочее).

- [ ] **Step 6: Проверка.** `npx vitest run payload/components` → PASS; `npx tsc --noEmit -p . 2>&1 | grep payload/components` → пусто. Браузерная проверка выполняется в Task 5 (нужна регистрация в конфиге).

- [ ] **Step 7: Коммит**

```bash
git add "app/(payload)/custom.scss" payload/components
git commit -m "feat(cms): тема админки, навигация и дашборд по макету

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Интеграция (основной агент)

**Files:**
- Modify: `payload.config.ts`
- Generated: `payload/payload-types.ts`, `app/(payload)/admin/importMap.js`, `migrations/*`

- [ ] **Step 1: Собрать конфиг** — `payload.config.ts`:

```ts
import { seoPlugin } from '@payloadcms/plugin-seo'
// … существующие импорты
import { Users } from './payload/collections/Users'
import { Media } from './payload/collections/Media'
import { Categories } from './payload/collections/Categories'
import { Products } from './payload/collections/Products'
import { Reviews } from './payload/collections/Reviews'
import { Customers } from './payload/collections/Customers'
import { Orders } from './payload/collections/Orders'
import { Leads } from './payload/collections/Leads'
import { PostCategories } from './payload/collections/PostCategories'
import { Posts } from './payload/collections/Posts'
import { Pages } from './payload/collections/Pages'
import { Home } from './payload/globals/Home'
import { About } from './payload/globals/About'
import { Delivery } from './payload/globals/Delivery'
import { Navigation } from './payload/globals/Navigation'
import { Settings } from './payload/globals/Settings'

// в buildConfig:
//   admin.components: {
//     Nav: '/payload/components/AdminNav#AdminNav',
//     views: { dashboard: { Component: '/payload/components/Dashboard#Dashboard' } },
//   },
//   collections: [Users, Customers, Categories, Products, Media, Reviews, Orders, Leads, PostCategories, Posts, Pages],
//   globals: [Home, About, Delivery, Navigation, Settings],
//   upload: { limits: { fileSize: 25 * 1024 * 1024 } },
//   plugins: [seoPlugin({ collections: ['categories', 'products', 'posts', 'pages'], uploadsCollection: 'media', tabbedUI: true })],
```

Раскомментировать и вставить в существующий `buildConfig`, сохранив остальные поля.

- [ ] **Step 2: Типы и importmap**

```bash
npm run generate:types && npm run generate:importmap
```

Expected: без ошибок; в `payload-types.ts` появились `Order`, `Product`, `Customer`, …

- [ ] **Step 3: Проверки**

```bash
npx vitest run
npm run typecheck
```

Expected: все тесты PASS, tsc чистый. Ошибки в файлах подагентов — исправить.

- [ ] **Step 4: Бэкап и миграция** (только основной агент; БД: `docker compose up -d`, порт 5442)

```bash
mkdir -p /tmp/claude-1000/-home-alexrush-web-wave-dev-zevs/73668b6e-8982-4926-ab21-b14dd95bc8c1/scratchpad
pg_dump "$DATABASE_URL" > /tmp/claude-1000/-home-alexrush-web-wave-dev-zevs/73668b6e-8982-4926-ab21-b14dd95bc8c1/scratchpad/pre-admin-models.sql
npm run payload migrate:create -- admin-models
```

Если `pg_dump` нет на хосте — `docker compose exec -T <сервис из docker-compose.yml> pg_dump -U <пользователь из DATABASE_URL> <база> > …`. Миграцию не применять на БД с чужими данными без подтверждения владельца; в dev схема синхронизируется `push`.

- [ ] **Step 5: Приёмка в браузере** (`npm run dev`, порт 43127, `/admin`)

Создать первого пользователя (получает роль admin автоматически). Проверить руками (скриншоты в `screenshots/`, `1440×900` и `375×812`, обе темы): дашборд; список моделей; карточка модели (вкладки «Основное», «Характеристики», «Цена и остатки»); создание заказа с двумя позициями → номер `ZP-YYYY-NNNN`, итог, запись в «История статусов»; создание пользователя `content` → в навигации нет «Продажи», `/admin/collections/orders` отказывает. Просмотреть снимки глазами; найденные дефекты темы вернуть исполнителю UI.

- [ ] **Step 6: `next build`**

Run: `npm run build` → успешно.

- [ ] **Step 7: Коммит**

```bash
git add payload.config.ts payload/payload-types.ts "app/(payload)/admin/importMap.js" migrations
git commit -m "feat(cms): регистрация коллекций, глобалов, SEO-плагин; типы и миграция

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Ревью и доска (основной агент)

- [ ] **Step 1: Независимое ревью** — один подагент `agent-qa`, только чтение: diff `git diff main...HEAD -- payload/ app/(payload)` с фокусом на доступы (матрица спеки §3, поля `syncError`/`b24*`, `orders` read/update для customer), расчёт `computeTotal` и защиту `manualOverride`. Результат — список дефектов; блокирующие исправить и повторить `npx vitest run`.

- [ ] **Step 2: Карточки доски** — создать `A-UI` («Тема, навигация, дашборд админки», трек `cms`, deps `S-5`), затем закрыть S-5, A-UI, C-CAT, C-ORD, C-LEADS, C-BLOG, C-CONTENT, C-REV:

```bash
bun docs/workflow/wf.mjs add cms --json '{"id":"A-UI","t":"Тема, навигация, дашборд админки","d":"custom.scss из макета, AdminNav, Dashboard","pr":"P1","st":"todo","own":"agent","deps":["S-5"],"acc":"Админка выглядит как макет в обеих темах; content не видит продажи."}'
bun docs/workflow/wf.mjs set S-5 st=done   # и далее для каждой карточки; в res — коммит и реальные проверки
bun docs/workflow/wf.mjs lint
```

Точный синтаксис `res`/`--anchors` — `bun docs/workflow/wf.mjs` без аргументов и `docs/AGENT-REFERENCE.md`. Отдельный коммит `docs(workflow): …`.

- [ ] **Step 3: Итог** — сверить diff со спекой §1 (критерии 1–5), кратко описать результат, ограничения (кнопка «Отправить в Б24 повторно», гостевой трекинг, НДС — вне объёма), шаги воспроизведения.

---

## Самопроверка плана

- **Покрытие спеки:** §3 доступы — Task 0 (+ поля в Task 1–3); §4.1–4.10 — Task 1 (categories, products, media, reviews), Task 2 (customers, orders, leads), Task 3 (posts, post-categories, pages, globals), SEO — Task 5; §5 UI — Task 4; §6 тесты — Tasks 0–2, 4; ограничения размеров медиа — Task 1 + Task 5; критерий 4 (`manualOverride`) — Task 1; критерий 5 (скриншоты) — Task 5 Step 5. Кнопка «Отправить в Б24 повторно» из карточки C-ORD сознательно отложена (в I-B24-DEAL): поле `syncError` есть.
- **Отклонение от спеки:** seed админа заменён автоназначением роли `admin` первому пользователю (Users hook) — скрипт seed не нужен.
- **Согласованность имён:** `hasRole`, `ownOrRoles`, `publishedOrStaff`, `selfOrAdmin`, `isAdmin`, `computeTotal`, `formatOrderNumber`, `nextStatusHistory`, `hasCustomerOrGuest`, `protectFromImport`, `isPriceLocked`, `kindFromMime`, `visibleGroups`, `NAV_GROUPS` — одинаковы во всех задачах.
- **Известные допущения, требующие сверки при исполнении:** сигнатуры `ServerProps`/`AdminViewServerProps` (Task 4), поведение `req.file`/`data.mimeType` в `beforeChange` Media (Task 1), `count` с `where._status` на versioned-коллекциях (Task 4) — исполнитель сверяет по типам Payload и документации навыка, а не по памяти.
