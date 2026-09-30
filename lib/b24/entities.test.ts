import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { createB24Client, type B24Error } from './client'
import { retryB24Sync, runB24Sync } from './sync'
import './company'
import './deal'
import './lead'

const WEBHOOK = 'https://zevs.bitrix24.ru/rest/1/SECRET/'
type Doc = Record<string, unknown>
type Call = { method: string; params: Record<string, unknown> }

/** Мок-портал Б24 поверх fetch: хранит созданные сущности, list ищет по ORIGIN_ID. */
function fakePortal(opts: { failOnce?: string } = {}) {
  const calls: Call[] = []
  const store: Record<string, Doc[]> = {}
  let nextId = 100
  let fail = opts.failOnce
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    const method = url.slice(WEBHOOK.length).replace(/\.json$/, '')
    const params = JSON.parse(String(init?.body)) as Record<string, unknown>
    calls.push({ method, params })
    if (method === fail) {
      fail = undefined
      return new Response(JSON.stringify({ error: 'QUERY_LIMIT_EXCEEDED' }), { status: 503 })
    }
    const [, entity, op] = /^crm\.(.+)\.(\w+)$/.exec(method) ?? []
    let result: unknown = true
    if (op === 'add') {
      const id = nextId++
      ;(store[entity] ??= []).push({ ID: String(id), ...(params.fields as Doc) })
      result = id
    } else if (op === 'list') {
      const filter = params.filter as Doc
      result = (store[entity] ?? []).filter((r) => Object.entries(filter).every(([k, v]) => String(r[k]) === String(v)))
    }
    return new Response(JSON.stringify({ result }), { status: 200 })
  })
  const b24 = createB24Client({ webhookUrl: WEBHOOK, fetch: f as unknown as typeof fetch, minIntervalMs: 0 })
  const adds = () => calls.filter((c) => c.method.endsWith('.add')).map((c) => c.method)
  return { b24, calls, store, adds }
}

function fakePayload(docs: Record<string, Doc>) {
  return {
    findByID: async ({ collection, id }: { collection: string; id: string | number }) => docs[`${collection}/${id}`] ?? null,
    update: async ({ collection, id, data }: { collection: string; id: string | number; data: Doc }) => Object.assign(docs[`${collection}/${id}`], data),
    logger: { info: vi.fn(), error: vi.fn() },
  } as unknown as Payload
}

const order = (over: Doc = {}): Doc => ({
  id: 1,
  number: 'ZP-2026-0007',
  createdAt: '2026-09-30T09:15:00.000Z',
  customer: 5,
  items: [
    { sku: 'FX-01', title: 'Перчатки Феникс', size: '10', coating: 'нитрил', price: 45.5, qty: 120 },
    { title: 'Перчатки Атлант', price: 30, qty: 50 },
  ],
  delivery: { carrier: 'cdek', city: 'Таганрог', address: 'ул. Петровская, 1', cost: 890 },
  total: 7850,
  paymentMethod: 'invoice_auto',
  comment: 'Позвонить до 12:00',
  ...over,
})

const legal = (): Doc => ({
  id: 5,
  kind: 'legal',
  name: 'Иван Петров',
  email: 'buyer@example.ru',
  phone: '+79001234567',
  company: 'ООО Прибой',
  inn: '6154000000',
  kpp: '615401001',
  bankName: 'Банк',
  bik: '046015602',
  bankAccount: '40702810000000000001',
})

beforeEach(() => {
  delete process.env.B24_GUEST_DEALS
  delete process.env.B24_REQUISITE_PRESET_ID
  delete process.env.B24_DEAL_CATEGORY_ID
})
afterEach(() => vi.unstubAllEnvs())

describe('сделка (I-B24-DEAL)', () => {
  it('порядок компания → контакт → сделка → строки; поля сделки из заказа', async () => {
    const docs = { 'orders/1': order(), 'customers/5': legal() }
    const p = fakePortal()
    const r = await runB24Sync({ kind: 'order', id: 1, payload: fakePayload(docs), b24: p.b24 })

    expect(p.adds()).toEqual(['crm.company.add', 'crm.contact.add', 'crm.deal.add'])
    expect(p.calls.at(-1)?.method).toBe('crm.deal.productrows.set')
    const [company, contact, deal] = [p.store.company[0], p.store.contact[0], p.store.deal[0]]
    expect(contact.COMPANY_ID).toBe(company.ID)
    expect(deal).toMatchObject({
      TITLE: 'Заказ ZP-2026-0007 с сайта',
      BEGINDATE: '2026-09-30T09:15:00.000Z',
      OPPORTUNITY: 7850,
      CURRENCY_ID: 'RUB',
      COMPANY_ID: company.ID,
      CONTACT_IDS: [contact.ID],
      ORIGIN_ID: 'ZP-2026-0007',
      ORIGINATOR_ID: 'zevsprotect.ru',
    })
    expect(deal).not.toHaveProperty('CATEGORY_ID') // не задано — не передаём
    const comments = String(deal.COMMENTS)
    for (const s of ['ZP-2026-0007', 'ООО Прибой', 'Оплата: Счёт (авто)', 'СДЭК, Таганрог, ул. Петровская, 1', 'Позвонить до 12:00']) expect(comments).toContain(s)

    const rows = p.calls.at(-1)!.params
    expect(rows.id).toBe(deal.ID)
    expect(rows.rows).toEqual([
      { PRODUCT_NAME: 'FX-01 Перчатки Феникс, р. 10, нитрил', PRICE: 45.5, QUANTITY: 120 },
      { PRODUCT_NAME: 'Перчатки Атлант', PRICE: 30, QUANTITY: 50 },
      { PRODUCT_NAME: 'Доставка: СДЭК, Таганрог, ул. Петровская, 1', PRICE: 890, QUANTITY: 1 },
    ])
    // сумма строк = сумма заказа
    expect((rows.rows as { PRICE: number; QUANTITY: number }[]).reduce((s, x) => s + x.PRICE * x.QUANTITY, 0)).toBe(7850)
    expect(r).toEqual({ status: 'sent', b24Id: deal.ID })
    expect(docs['orders/1']).toMatchObject({ b24DealId: deal.ID, syncError: null })
    expect(docs['customers/5']).toMatchObject({ b24CompanyId: company.ID, b24ContactId: contact.ID })
  })

  it('организация/ИНН/КПП из оформления попадают в сделку, даже если отличаются от профиля', async () => {
    const docs = {
      'orders/1': order({ guest: { name: 'Пётр', phone: '+79005554433', email: 'p@example.ru', company: 'ООО Филиал', inn: '6154111111', kpp: '615402002' } }),
      'customers/5': { ...legal(), b24CompanyId: '7', b24ContactId: '8' },
    }
    const p = fakePortal()
    await runB24Sync({ kind: 'order', id: 1, payload: fakePayload(docs), b24: p.b24 })
    const comments = String(p.store.deal[0].COMMENTS)
    expect(comments).toContain('Клиент: ООО Прибой, Иван Петров, ИНН 6154000000')
    expect(comments).toContain('Данные оформления: Пётр, ООО Филиал, ИНН 6154111111, КПП 615402002, +79005554433, p@example.ru')
  })

  it('клиент уже в Б24 — компания/контакт не создаются, сделка ссылается на них', async () => {
    const docs = { 'orders/1': order(), 'customers/5': { ...legal(), b24CompanyId: '7', b24ContactId: '8' } }
    const p = fakePortal()
    await runB24Sync({ kind: 'order', id: 1, payload: fakePayload(docs), b24: p.b24 })
    expect(p.adds()).toEqual(['crm.deal.add'])
    expect(p.store.deal[0]).toMatchObject({ COMPANY_ID: '7', CONTACT_IDS: ['8'] })
  })

  it('сбой productrows → retry и syncError; повтор находит сделку по ORIGIN_ID, дубля нет', async () => {
    const docs = { 'orders/1': order(), 'customers/5': legal() }
    const p = fakePortal({ failOnce: 'crm.deal.productrows.set' })
    const payload = fakePayload(docs)
    const err = (await runB24Sync({ kind: 'order', id: 1, payload, b24: p.b24 }).catch((e) => e)) as B24Error
    expect(err.retryable).toBe(true)
    expect(docs['orders/1'].syncError).toMatch(/повтор по расписанию/)
    expect(docs['orders/1'].b24DealId).toBeUndefined()

    const r = await runB24Sync({ kind: 'order', id: 1, payload, b24: p.b24 })
    expect(r.status).toBe('sent')
    expect(p.adds()).toEqual(['crm.company.add', 'crm.contact.add', 'crm.deal.add'])
    expect(docs['orders/1']).toMatchObject({ b24DealId: p.store.deal[0].ID, syncError: null })
  })

  it('сбой после создания компании: повтор не плодит компанию, контакт привязан', async () => {
    const docs = { 'orders/1': order(), 'customers/5': legal() }
    const p = fakePortal({ failOnce: 'crm.contact.add' })
    const payload = fakePayload(docs)
    await expect(runB24Sync({ kind: 'order', id: 1, payload, b24: p.b24 })).rejects.toMatchObject({ retryable: true })
    expect(docs['customers/5'].b24CompanyId).toBe(p.store.company[0].ID) // промежуточный ID сохранён сразу
    await runB24Sync({ kind: 'order', id: 1, payload, b24: p.b24 })
    expect(p.store.company).toHaveLength(1)
    expect(p.store.contact).toHaveLength(1)
    expect(p.store.contact[0].COMPANY_ID).toBe(p.store.company[0].ID)
  })

  it('гость: по умолчанию сделка не создаётся (BIZ-7)', async () => {
    const docs = { 'orders/2': order({ id: 2, customer: null, guest: { name: 'Олег', phone: '+79990000000' } }) }
    const p = fakePortal()
    expect(await runB24Sync({ kind: 'order', id: 2, payload: fakePayload(docs), b24: p.b24 })).toEqual({ status: 'skipped' })
    expect(p.calls).toEqual([])
  })

  it('гость при B24_GUEST_DEALS=1: контакт по телефону/email и сделка', async () => {
    vi.stubEnv('B24_GUEST_DEALS', '1')
    const docs = { 'orders/2': order({ id: 2, customer: null, guest: { name: 'Олег', phone: '+79990000000', email: 'o@example.ru', company: 'ИП Олег', inn: '615400000000', kpp: '615401002' } }) }
    const p = fakePortal()
    await runB24Sync({ kind: 'order', id: 2, payload: fakePayload(docs), b24: p.b24 })
    expect(p.adds()).toEqual(['crm.contact.add', 'crm.deal.add'])
    expect(p.store.contact[0]).toMatchObject({ NAME: 'Олег', PHONE: [{ VALUE: '+79990000000', VALUE_TYPE: 'WORK' }], EMAIL: [{ VALUE: 'o@example.ru', VALUE_TYPE: 'WORK' }], ORIGIN_ID: 'order:ZP-2026-0007' })
    expect(p.store.deal[0]).toMatchObject({ CONTACT_IDS: [p.store.contact[0].ID] })
    expect(p.store.deal[0]).not.toHaveProperty('COMPANY_ID')
    expect(String(p.store.deal[0].COMMENTS)).toContain('Данные оформления: Олег, ИП Олег, ИНН 615400000000, КПП 615401002, +79990000000, o@example.ru')
    expect(String(p.store.contact[0].COMMENTS)).toBe('Компания: ИП Олег\nИНН: 615400000000\nКПП: 615401002')
  })

  it('воронка/стадия/ответственный — только из env', async () => {
    vi.stubEnv('B24_DEAL_CATEGORY_ID', '3')
    vi.stubEnv('B24_DEAL_STAGE_ID', 'C3:NEW')
    vi.stubEnv('B24_ASSIGNED_BY_ID', '12')
    const docs = { 'orders/1': order(), 'customers/5': { ...legal(), b24CompanyId: '7', b24ContactId: '8' } }
    const p = fakePortal()
    await runB24Sync({ kind: 'order', id: 1, payload: fakePayload(docs), b24: p.b24 })
    expect(p.store.deal[0]).toMatchObject({ CATEGORY_ID: '3', STAGE_ID: 'C3:NEW', ASSIGNED_BY_ID: '12' })
  })
})

describe('компания и контакт (I-B24-COMP)', () => {
  it('юрлицо: компания, реквизиты (при шаблоне), контакт с COMPANY_ID', async () => {
    vi.stubEnv('B24_REQUISITE_PRESET_ID', '1')
    const docs = { 'customers/5': legal() }
    const p = fakePortal()
    const r = await runB24Sync({ kind: 'company', id: 5, payload: fakePayload(docs), b24: p.b24 })
    expect(p.adds()).toEqual(['crm.company.add', 'crm.requisite.add', 'crm.requisite.bankdetail.add', 'crm.contact.add'])
    const company = p.store.company[0]
    expect(company).toMatchObject({ TITLE: 'ООО Прибой', ORIGIN_ID: 'customer:5', EMAIL: [{ VALUE: 'buyer@example.ru', VALUE_TYPE: 'WORK' }] })
    expect(String(company.COMMENTS)).toContain('КПП: 615401001')
    expect(p.store.requisite[0]).toMatchObject({ ENTITY_TYPE_ID: 4, ENTITY_ID: company.ID, PRESET_ID: '1', RQ_INN: '6154000000', RQ_KPP: '615401001' })
    expect(p.store['requisite.bankdetail'][0]).toMatchObject({ RQ_BIK: '046015602', RQ_ACC_NUM: '40702810000000000001' })
    expect(p.store.contact[0]).toMatchObject({ NAME: 'Иван Петров', COMPANY_ID: company.ID })
    expect(r).toEqual({ status: 'sent', b24Id: company.ID })
    expect(docs['customers/5']).toMatchObject({ b24CompanyId: company.ID, b24ContactId: p.store.contact[0].ID, syncError: null })
  })

  it('регистрация юрлица: контакт упал после компании — повтор job company досоздаёт контакт, syncError очищен', async () => {
    const docs = { 'customers/5': legal() }
    const p = fakePortal({ failOnce: 'crm.contact.add' })
    const payload = fakePayload(docs)
    await expect(runB24Sync({ kind: 'company', id: 5, payload, b24: p.b24 })).rejects.toMatchObject({ retryable: true })
    expect(docs['customers/5'].b24CompanyId).toBe(p.store.company[0].ID)
    expect(docs['customers/5'].syncError).toMatch(/повтор/)
    // ручной повтор тоже не считает такого клиента готовым
    const queued: unknown[] = []
    Object.assign(payload, { jobs: { queue: async (a: unknown) => queued.push(a) } })
    expect(await retryB24Sync(payload, 'company', 5)).toEqual({ status: 'queued' })

    const r = await runB24Sync({ kind: 'company', id: 5, payload, b24: p.b24 })
    expect(r).toEqual({ status: 'sent', b24Id: p.store.company[0].ID })
    expect(p.store.company).toHaveLength(1)
    expect(p.store.contact).toHaveLength(1)
    expect(p.store.contact[0].COMPANY_ID).toBe(p.store.company[0].ID)
    expect(docs['customers/5']).toMatchObject({ b24ContactId: p.store.contact[0].ID, syncError: null })
    expect(await runB24Sync({ kind: 'company', id: 5, payload, b24: p.b24 })).toEqual({ status: 'already', b24Id: p.store.company[0].ID })
  })

  it('физлицо: только контакт, повтор ничего не создаёт', async () => {
    const docs = { 'customers/6': { id: 6, kind: 'person', name: 'Анна', email: 'a@example.ru' } as Doc }
    const p = fakePortal()
    const payload = fakePayload(docs)
    expect(await runB24Sync({ kind: 'company', id: 6, payload, b24: p.b24 })).toEqual({ status: 'skipped' })
    expect(p.adds()).toEqual(['crm.contact.add'])
    expect(p.store.contact[0]).not.toHaveProperty('COMPANY_ID')
    expect(docs['customers/6'].b24ContactId).toBe(p.store.contact[0].ID)
    await runB24Sync({ kind: 'company', id: 6, payload, b24: p.b24 })
    expect(p.adds()).toEqual(['crm.contact.add'])
  })

  it('параллельные job регистрации и заказа не создают двух компаний', async () => {
    const docs = { 'orders/1': order(), 'customers/5': legal() }
    const p = fakePortal()
    const payload = fakePayload(docs)
    await Promise.all([runB24Sync({ kind: 'company', id: 5, payload, b24: p.b24 }), runB24Sync({ kind: 'order', id: 1, payload, b24: p.b24 })])
    expect(p.store.company).toHaveLength(1)
    expect(p.store.contact).toHaveLength(1)
  })

  it('ID потерян (не сохранился) — находим по ORIGIN_ID, add не повторяется', async () => {
    const docs = { 'customers/5': legal() }
    const p = fakePortal()
    const payload = fakePayload(docs)
    await runB24Sync({ kind: 'company', id: 5, payload, b24: p.b24 })
    Object.assign(docs['customers/5'], { b24CompanyId: null, b24ContactId: null })
    await runB24Sync({ kind: 'company', id: 5, payload, b24: p.b24 })
    expect(p.adds()).toEqual(['crm.company.add', 'crm.contact.add'])
  })
})

describe('лид (I-B24-LEAD)', () => {
  const lead = (type: string, over: Doc = {}): Doc => ({
    id: 11,
    type,
    name: 'Сергей',
    phone: '+79001112233',
    email: 's@example.ru',
    company: 'ООО Стройка',
    message: 'Нужно 5000 пар',
    data: { volume: '5000', city: 'Ростов' },
    sourceUrl: '/catalog/feniks',
    ...over,
  })

  it.each([
    ['calculation', 'Расчёт поставки'],
    ['consultation', 'Консультация'],
    ['samples', 'Образцы'],
    ['feedback', 'Обратная связь'],
    ['pricelist', 'Прайс-лист'],
    ['cart', 'Запрос из корзины'],
    ['product-request', 'Запрос по товару'],
  ])('%s → лид с типом формы, контактами, сообщением и источником', async (type, label) => {
    const docs = { 'leads/11': lead(type) }
    const p = fakePortal()
    const r = await runB24Sync({ kind: 'lead', id: 11, payload: fakePayload(docs), b24: p.b24 })
    const l = p.store.lead[0]
    expect(l).toMatchObject({
      TITLE: `${label} — ООО Стройка`,
      NAME: 'Сергей',
      COMPANY_TITLE: 'ООО Стройка',
      PHONE: [{ VALUE: '+79001112233', VALUE_TYPE: 'WORK' }],
      EMAIL: [{ VALUE: 's@example.ru', VALUE_TYPE: 'WORK' }],
      SOURCE_ID: 'WEB',
      SOURCE_DESCRIPTION: `zevsprotect.ru, форма «${label}», страница /catalog/feniks`,
      ORIGIN_ID: 'lead:11',
    })
    expect(l.COMMENTS).toBe(`Форма: ${label}\nНужно 5000 пар\nvolume: 5000\ncity: Ростов`)
    expect(docs['leads/11']).toMatchObject({ b24LeadId: r.b24Id, syncError: null })
  })

  it('повторная доставка без сохранённого ID — лид находится по ORIGIN_ID', async () => {
    const docs = { 'leads/11': lead('cart', { email: null, company: null }) }
    const p = fakePortal()
    const payload = fakePayload(docs)
    await runB24Sync({ kind: 'lead', id: 11, payload, b24: p.b24 })
    docs['leads/11'].b24LeadId = null
    await runB24Sync({ kind: 'lead', id: 11, payload, b24: p.b24 })
    expect(p.adds()).toEqual(['crm.lead.add'])
    expect(p.store.lead[0].EMAIL).toBeUndefined()
  })
})
