import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'
import type { CollectionBeforeChangeHook } from 'payload'
import { Orders } from '@/payload/collections/Orders'
import type { Customer, Order } from '@/payload/payload-types'
import { handleExchange } from './exchange'
import { escapeXml, loadOrdersToExport, markExported, ordersXml, type ExportRefs } from './orders-export'
import { child, kids, parseXml, text } from './xml'

const T0 = '2026-09-30T09:15:00.000Z'
const NOW = new Date('2026-09-30T10:00:00.000Z')

const base = { createdAt: T0, updatedAt: T0, paymentStatus: 'pending', status: 'accepted' } as const
const orders: Order[] = [
  {
    ...base,
    id: 11,
    number: 'ZP-2026-0001',
    customer: 1,
    guest: { name: 'Иванов Пётр', phone: '+7 900 000-00-01', email: 'buyer@ooo.ru', company: 'ООО «Рога & Копыта» <Юг>', inn: '6154000000', kpp: '615401001' },
    items: [
      { product: 101, sku: 'ZP-FNX', title: 'Перчатки «Феникс»', size: '10', coating: 'Нитрил', price: 45.5, qty: 120 },
      { product: 102, sku: 'ZP-ATL', title: 'Атлант 🧤 ПВХ', size: '9', price: 19.99, qty: 3 },
    ],
    total: 6019.97,
    delivery: { city: 'Ростов-на-Дону', carrier: 'cdek', carrierName: 'СДЭК', cost: 500, address: 'ул. Мира, 1' },
    comment: 'Позвонить до 12:00\nворота "Б"\u0007',
    paymentMethod: 'invoice_auto',
  },
  {
    ...base,
    id: 12,
    number: 'ZP-2026-0002',
    customer: 2,
    guest: { name: 'Сидорова Анна', phone: '+79000000002', email: 'anna@mail.ru' },
    items: [{ product: 101, sku: 'ZP-FNX', title: 'Перчатки «Феникс»', size: '8', price: 50, qty: 12 }],
    total: 600,
    delivery: { city: 'Таганрог', carrier: 'pickup', carrierName: 'Самовывоз', address: 'Таганрог, Поляковское ш., 16' },
    paymentMethod: 'online',
    paymentStatus: 'paid',
  },
  {
    ...base,
    id: 13,
    number: 'ZP-2026-0003',
    guest: { name: 'Гость Без Регистрации', phone: '+79000000003' },
    items: [{ product: 103, sku: 'SITE-ONLY', title: 'Модель без GUID', size: '10', price: 10, qty: 50 }],
    total: 500,
    delivery: { carrier: 'terminal', carrierName: 'Терминал ТК', city: 'Москва', address: 'ПЭК, Москва' },
    paymentMethod: 'invoice_manager',
    status: 'cancelled',
  },
]
const customers = [
  { id: 1, kind: 'legal', name: 'Иванов Пётр', email: 'buyer@ooo.ru', address: '347900, Таганрог, ул. Заводская, 1', onecId: 'a1b2-1c' },
  { id: 2, kind: 'person', name: 'Сидорова Анна', email: 'anna@mail.ru' },
] as unknown as Customer[]
const products = [
  { id: 101, guid1c: 'guid-fenix' },
  { id: 102, guid1c: 'guid-atlant' },
  { id: 103, guid1c: null },
]
const refs: ExportRefs = { customers: new Map(customers.map((c) => [c.id, c])), guids: new Map([[101, 'guid-fenix'], [102, 'guid-atlant']]) }

const FIXTURE = path.join(__dirname, '__fixtures__', 'orders-export.xml')

describe('XML заказов', () => {
  const xml = ordersXml(orders, refs, NOW)

  it('совпадает с фикстурой', () => {
    if (process.env.UPDATE_FIXTURES) writeFileSync(FIXTURE, xml)
    expect(xml).toBe(readFileSync(FIXTURE, 'utf8'))
  })

  it('фикстура — корректный XML; состав, клиенты, доставка', () => {
    const root = parseXml(readFileSync(FIXTURE, 'utf8'))
    expect(root.name).toBe('КоммерческаяИнформация')
    const docs = kids(root, 'Документ')
    expect(docs.map((d) => text(d, 'Номер'))).toEqual(['ZP-2026-0001', 'ZP-2026-0002', 'ZP-2026-0003'])
    const [legal, person, guest] = docs
    // юрлицо: название, ИНН/КПП, юр. адрес, контактное лицо, спецсимволы и эмодзи
    const firm = child(child(legal, 'Контрагенты'), 'Контрагент')
    expect(text(firm, 'Наименование')).toBe('ООО «Рога & Копыта» <Юг>')
    expect(text(firm, 'КПП')).toBe('615401001')
    expect(text(firm, 'Ид')).toBe('a1b2-1c')
    expect(text(child(firm, 'ЮридическийАдрес'), 'Представление')).toMatch(/Заводская/)
    expect(text(legal, 'Время')).toBe('12:15:00')
    expect(text(legal, 'Комментарий')).toBe('Позвонить до 12:00\nворота "Б"')
    const goods = kids(child(legal, 'Товары'), 'Товар')
    expect(goods.map((g) => text(g, 'Ид'))).toEqual(['guid-fenix', 'guid-atlant', 'ORDER_DELIVERY'])
    expect(text(goods[1], 'Наименование')).toBe('Атлант  ПВХ')
    expect(goods.map((g) => text(g, 'Сумма'))).toEqual(['5460.00', '59.97', '500.00'])
    expect(text(legal, 'Сумма')).toBe('6019.97') // = Σ строк + доставка
    // физлицо: ФИО, без КПП и представителей; без стоимости доставки — без позиции-услуги
    const p = child(child(person, 'Контрагенты'), 'Контрагент')
    expect(text(p, 'ПолноеНаименование')).toBe('Сидорова Анна')
    expect(child(p, 'КПП')).toBeUndefined()
    expect(kids(child(person, 'Товары'), 'Товар')).toHaveLength(1)
    // гость и товар без GUID 1С — Ид по артикулу
    const g = child(child(guest, 'Контрагенты'), 'Контрагент')
    expect(text(g, 'Ид')).toBe('site-g13')
    expect(text(child(child(guest, 'Товары'), 'Товар'), 'Ид')).toBe('SITE-ONLY')
    const props = Object.fromEntries(kids(child(guest, 'ЗначенияРеквизитов'), 'ЗначениеРеквизита').map((r) => [text(r, 'Наименование'), text(r, 'Значение')]))
    expect(props).toMatchObject({ 'Способ оплаты': 'Счёт от менеджера', 'Статус заказа': 'Отменён', Отменен: 'true', 'Дата изменения': '2026-09-30 12:15:00' })
  })

  it('пустой набор — корректный документ без заказов', () => {
    expect(kids(parseXml(ordersXml([], refs, NOW)), 'Документ')).toHaveLength(0)
  })

  it('escapeXml: спецсимволы, управляющие, эмодзи, одиночные суррогаты', () => {
    expect(escapeXml(`a&b<c>"d'`)).toBe('a&amp;b&lt;c&gt;&quot;d&apos;')
    expect(escapeXml('x\u0000\u001f￾y')).toBe('xy')
    expect(escapeXml('👍🏻❤️ok\uD800')).toBe('❤ok')
    expect(escapeXml('Зевс®')).toBe('Зевс®')
  })
})

const runBeforeChange = (data: Record<string, unknown>, originalDoc: object, context: Record<string, unknown> = {}) =>
  (Orders.hooks!.beforeChange![0] as (a: unknown) => Record<string, unknown>)({ data, originalDoc, context, operation: 'update' } satisfies Partial<Parameters<CollectionBeforeChangeHook>[0]>)

describe('сброс пометки выгрузки (Orders.beforeChange)', () => {
  const exported = { ...orders[0], onecExportedAt: NOW.toISOString() }
  const reset = (data: Record<string, unknown>, context?: Record<string, unknown>) => runBeforeChange(structuredClone(data), exported, context).onecExportedAt === null

  it('технические записи Б24 не сбрасывают', () => {
    expect(reset({ syncError: null })).toBe(false)
    expect(reset({ b24DealId: '77', syncError: null })).toBe(false)
    expect(reset({ status: 'picking' }, { skipOnecReset: true })).toBe(false) // флаг — страховка
  })
  it('сохранение без изменений (полный документ из админки, id строк, связь документом) не сбрасывает', () => {
    const full = structuredClone(exported) as Record<string, unknown>
    full.items = (full.items as object[]).map((it, i) => ({ ...it, id: `row${i}` }))
    full.customer = { id: 1, createdAt: T0 }
    full.guest = { ...(full.guest as object), inn: '6154000000', kpp: '615401001', company: 'ООО «Рога & Копыта» <Юг>' }
    expect(reset(full)).toBe(false)
    expect(reset({ delivery: { cost: 500 } })).toBe(false) // частичная группа
  })
  it('изменение состава, статуса, адреса, оплаты, комментария сбрасывает', () => {
    expect(reset({ items: [{ ...orders[0].items[0], qty: 240 }, orders[0].items[1]] })).toBe(true)
    expect(reset({ status: 'picking' })).toBe(true)
    expect(reset({ delivery: { address: 'ул. Мира, 2' } })).toBe(true)
    expect(reset({ paymentStatus: 'paid' })).toBe(true)
    expect(reset({ comment: 'другой' })).toBe(true)
    expect(reset({ guest: { phone: '+70000000000' } })).toBe(true)
  })
})

/** Заказы в памяти: find по onecExportedAt/id, db.updateOne атомарно по id+updatedAt, update как Payload (сброс пометки хуком). */
function fakeStore() {
  const db = { orders: structuredClone(orders), customers, products }
  let tick = 0
  const payload = {
    find: async ({ collection, where }: { collection: keyof typeof db; where: Record<string, { exists?: boolean; in?: number[] }> }) => {
      let docs = db[collection] as { id: number; onecExportedAt?: string | null }[]
      if (where.onecExportedAt) docs = docs.filter((d) => !d.onecExportedAt)
      if (where.id?.in) docs = docs.filter((d) => where.id.in!.includes(d.id))
      return { docs: structuredClone(docs) }
    },
    db: {
      updateOne: async ({ where, data }: { where: { and: [{ id: { equals: number } }, { updatedAt: { equals: string } }] }; data: { onecExportedAt: string } }) => {
        const o = db.orders.find((d) => d.id === where.and[0].id.equals && d.updatedAt === where.and[1].updatedAt.equals)
        if (!o) return null
        o.onecExportedAt = data.onecExportedAt
        return o
      },
    },
  }
  /** payload.update: настоящий Orders.beforeChange, затем запись и новый updatedAt. */
  const edit = (id: number, patch: Record<string, unknown>, context: Record<string, unknown> = {}) => {
    const o = db.orders.find((d) => d.id === id)!
    const out = runBeforeChange(structuredClone(patch), o, context)
    Object.assign(o, out, { updatedAt: new Date(Date.parse(T0) + ++tick * 1000).toISOString() })
  }
  return { payload: payload as unknown as Payload, db, edit }
}

describe('отбор и пометка', () => {
  it('повторный query без success — те же заказы; после success не уходят; изменённый после query — уходит снова', async () => {
    const s = fakeStore()
    const q1 = await loadOrdersToExport(s.payload, 500)
    expect(q1.orders.map((o) => o.id)).toEqual([11, 12, 13])
    expect(q1.refs.guids.get(103)).toBeUndefined()
    expect((await loadOrdersToExport(s.payload, 500)).snapshot).toEqual(q1.snapshot)
    s.edit(12, { status: 'picking' }) // правка между query и success
    expect(await markExported(s.payload, q1.snapshot, NOW)).toBe(2)
    expect((await loadOrdersToExport(s.payload, 500)).orders.map((o) => o.id)).toEqual([12])
    // повторный success того же снимка — безопасен, ничего не меняет
    expect(await markExported(s.payload, q1.snapshot, NOW)).toBe(2)
    expect(await markExported(s.payload, [], NOW)).toBe(0)
    s.edit(11, { comment: 'новый' })
    expect((await loadOrdersToExport(s.payload, 500)).orders.map((o) => o.id).sort()).toEqual([11, 12])
  })

  it('помеченный заказ после технической записи Б24 не уходит повторно', async () => {
    const s = fakeStore()
    await markExported(s.payload, (await loadOrdersToExport(s.payload, 500)).snapshot, NOW)
    s.edit(13, { b24DealId: '501', syncError: null }, { skipOnecReset: true })
    s.edit(12, { syncError: 'сбой' })
    expect((await loadOrdersToExport(s.payload, 500)).orders).toHaveLength(0)
  })

  it('конкурентные сессии: обе получают заказы, двойная пометка идемпотентна', async () => {
    const s = fakeStore()
    const [a, b] = await Promise.all([loadOrdersToExport(s.payload, 500), loadOrdersToExport(s.payload, 500)])
    await Promise.all([markExported(s.payload, a.snapshot, NOW), markExported(s.payload, b.snapshot, NOW)])
    expect((await loadOrdersToExport(s.payload, 500)).orders).toHaveLength(0)
  })
})

describe('/api/1c-exchange type=sale', () => {
  const basic = `Basic ${Buffer.from('site1c:p').toString('base64')}`
  function setup() {
    const env = { ONEC_EXCHANGE_USER: 'site1c', ONEC_EXCHANGE_PASSWORD: 'p', ONEC_EXCHANGE_DIR: mkdtempSync(path.join(tmpdir(), 'onec-sale-')) } as unknown as NodeJS.ProcessEnv
    const s = { ...fakeStore(), dir: env.ONEC_EXCHANGE_DIR as string }
    const call = async (query: string, cookie = '', auth = '') => {
      const headers = new Headers()
      if (cookie) headers.set('cookie', cookie)
      if (auth) headers.set('authorization', auth)
      const res = await handleExchange({ url: `http://site/api/1c-exchange?${query}`, headers, body: async () => undefined }, { payload: s.payload, env, now: NOW.getTime() })
      return { status: res.status, type: res.headers.get('content-type'), text: await res.text() }
    }
    const login = async () => {
      const [, name, value] = (await call('type=sale&mode=checkauth', '', basic)).text.split('\n')
      return `${name}=${value}`
    }
    return { s, call, login }
  }
  const numbers = (xml: string) => kids(parseXml(xml), 'Документ').map((d) => text(d, 'Номер'))

  it('без сессии — 401', async () => {
    const { call } = setup()
    expect((await call('type=sale&mode=query')).status).toBe(401)
    expect((await call('type=sale&mode=success')).status).toBe(401)
  })

  it('checkauth → init → query → success; повторный query в новой сессии пуст', async () => {
    const { call, login } = setup()
    const c = await login()
    expect((await call('type=sale&mode=init', c)).text).toMatch(/^zip=no\nfile_limit=\d+$/)
    const q = await call('type=sale&mode=query', c)
    expect(q.type).toMatch(/application\/xml/)
    expect(numbers(q.text)).toHaveLength(3)
    expect(numbers((await call('type=sale&mode=query', c)).text)).toHaveLength(3) // повтор без success
    expect((await call('type=sale&mode=success', c)).text).toBe('success')
    expect((await call('type=sale&mode=success', c)).text).toBe('success') // повтор success
    const c2 = await login()
    expect((await call('type=sale&mode=success', c2)).text).toBe('success') // success без query
    expect(numbers((await call('type=sale&mode=query', c2)).text)).toHaveLength(0)
  })

  it('повреждённый снимок query — success, ничего не помечено, снимок удалён', async () => {
    const { call, login, s } = setup()
    const c = await login()
    await call('type=sale&mode=query', c)
    const sid = c.split('=')[1].split('.')[1]
    const snap = path.join(s.dir, sid, 'sale-query.json')
    writeFileSync(snap, '{битый')
    expect((await call('type=sale&mode=success', c)).text).toBe('success')
    expect(existsSync(snap)).toBe(false)
    expect(numbers((await call('type=sale&mode=query', c)).text)).toHaveLength(3)
  })

  it('неизвестный mode — failure', async () => {
    const { call, login } = setup()
    expect((await call('type=sale&mode=zzz', await login())).text).toMatch(/^failure/)
  })
})
