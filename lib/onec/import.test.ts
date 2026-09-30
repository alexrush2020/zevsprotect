import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCommerceMl, type CmlPackage } from './commerceml'
import { changedFields, planImport, runImport } from './import'
import { fakePayload } from './fake-payload.test-util'

const load = (name: string): CmlPackage => {
  const r = parseCommerceMl(readFileSync(path.join(__dirname, '__fixtures__', name)))
  if (!r.ok) throw new Error(r.errors.join('\n'))
  return r.pkg
}
const both = (): CmlPackage => ({ catalog: load('import.xml').catalog, offers: load('offers.xml').offers })
const FEN = 'a1b2c3d4-0000-0000-0000-00000000fe01'
const ATL = 'a1b2c3d4-0000-0000-0000-0000000a7101'
const NOPRICE = 'a1b2c3d4-0000-0000-0000-0000000b0001'

// Payload отдаёт все поля документа (пустые — null), как и снимок в runImport
const EMPTY = Object.fromEntries(['description', 'base', 'coating', 'coatingType', 'knitClass', 'tex', 'weight', 'length', 'guid1c'].map((k) => [k, null]))

// категория и товар, заведённые на сайте (seed) — без GUID 1С
const seeded = () => ({
  categories: [{ id: 1, title: 'Нитриловые', slug: 'nitril' }],
  products: [
    { ...EMPTY, id: 10, title: 'Атлант', colors: [], sizes: [], specs: [], slug: 'atlant', sku: 'ZP-ATL-01', category: 1, price: 30, stock: 5, unit: 'пара', _status: 'published', manualOverride: false, gallery: [] },
  ],
})
const dir = () => mkdtempSync(path.join(tmpdir(), 'onec-test-'))

describe('planImport', () => {
  it('ONEC_PRICE_TYPE_ID выбирает цену своего типа; без него — первая цена + допущение в отчёте', () => {
    const snap = { categories: [], products: [] }
    const byType = planImport(both(), snap, { priceTypeId: 'pt-opt' })
    expect(byType.products.find((p) => p.guid1c === FEN)!.data.price).toBe(45.5)
    expect(byType.notes).toEqual([])
    const first = planImport(both(), snap)
    expect(first.products.find((p) => p.guid1c === FEN)!.data.price).toBe(60)
    expect(first.notes.join()).toMatch(/ДОПУЩЕНИЕ.*первая цена/)
  })
  it('товар без цены: price не пишется (не 0), остаток пишется', () => {
    const plan = planImport(both(), { categories: [], products: [] }, { priceTypeId: 'pt-opt' })
    const np = plan.products.find((p) => p.guid1c === NOPRICE)!
    expect('price' in np.data).toBe(false)
    expect(np.data.stock).toBe(5)
    expect(plan.warnings.join()).toMatch(/нет цены/)
  })
  it('отрицательный остаток склада не уводит stock ниже нуля', () => {
    const plan = planImport(both(), { categories: [], products: [] })
    expect(plan.products.find((p) => p.guid1c === ATL)!.data.stock).toBe(280)
  })
  it('свойства → поля карточки, прочие → specs, реквизиты не на витрину', () => {
    const fen = planImport(both(), { categories: [], products: [] }).products.find((p) => p.guid1c === FEN)!
    expect(fen.data).toMatchObject({ base: 'Полиэстер', coating: 'Нитрил', colors: ['оранжевый', 'чёрный'], sizes: ['9', '10'], knitClass: '13' })
    expect(fen.data.specs).toEqual([{ key: 'Плотность, г/м²', value: '45' }])
  })
  it('тип цены из env не найден в пакете — ошибка (цену не угадываем)', () => {
    expect(planImport(both(), { categories: [], products: [] }, { priceTypeId: 'pt-nope' }).errors.join()).toMatch(/не найден в пакете/)
  })
  it('цена не в рублях — ошибка пакета', () => {
    const pkg = both()
    pkg.offers!.offers[1].prices[0].currency = 'USD'
    expect(planImport(pkg, { categories: [], products: [] }).errors.join()).toMatch(/USD/)
  })
  it('разные цены характеристик одного товара — цена не пишется', () => {
    const pkg: CmlPackage = {
      offers: {
        onlyChanges: true,
        priceTypes: [],
        offers: [
          { id: `${FEN}#s9`, productId: FEN, prices: [{ value: 40 }], quantity: 1 },
          { id: `${FEN}#s10`, productId: FEN, prices: [{ value: 42 }], quantity: 2 },
        ],
      },
    }
    const plan = planImport(pkg, { categories: [], products: [{ id: 5, guid1c: FEN }] })
    expect(plan.products[0].data).toEqual({ stock: 3 })
  })
})

describe('changedFields', () => {
  it('описание сравнивается по тексту, галерея — по id, jsonb-порядок ключей не важен', () => {
    const existing = {
      description: { root: { children: [{ type: 'paragraph', children: [{ text: 'А' }] }] } },
      gallery: [{ id: 'row1', image: { id: 7, url: '/x' } }],
      specs: [{ id: 'r', value: '1', key: 'k' }],
    }
    expect(changedFields({ description: 'А', gallery: [{ image: 7 }], specs: [{ key: 'k', value: '1' }] }, existing)).toEqual([])
    expect(changedFields({ description: 'Б' }, existing)).toEqual(['description'])
  })
})

describe('runImport', () => {
  it('первый импорт: связывает категорию и товар сайта, новые — черновиком, без дублей', async () => {
    const f = fakePayload(seeded())
    const r = await runImport(f.payload, both(), { dir: dir(), priceTypeId: 'pt-opt' })
    expect(r.ok).toBe(true)
    expect(r).toMatchObject({ created: 2, updated: 1, categoriesLinked: 1, categoriesCreated: 2 })
    expect(f.db.categories.find((c) => c.id === 1)!.guid1c).toBe('grp-nitril')
    const knit = f.db.categories.find((c) => c.guid1c === 'grp-knit')!
    expect(knit.parent).toBe(f.db.categories.find((c) => c.guid1c === 'grp-gloves')!.id)
    // товар сайта связан по артикулу, не задублирован
    expect(f.db.products.filter((p) => p.sku === 'ZP-ATL-01')).toHaveLength(1)
    expect(f.db.products.find((p) => p.id === 10)).toMatchObject({ guid1c: ATL, price: 31, stock: 280, category: knit.id })
    // опубликованный остаётся опубликованным (draft: false), новые — черновик
    expect(f.writes.find((w) => w.collection === 'products' && w.id === 10)!.draft).toBe(false)
    const created = f.writes.filter((w) => w.collection === 'products' && w.op === 'create')
    expect(created.every((w) => w.draft === true && w.data._status === 'draft')).toBe(true)
    const fen = f.db.products.find((p) => p.guid1c === FEN)!
    expect(fen).toMatchObject({ sku: 'ZP-FEN-01', price: 45.5, stock: 1200, unit: 'пар', slug: 'perchatki-feniks-nitrilovye-obliv' })
    expect(f.db.products.find((p) => p.guid1c === NOPRICE)!.price).toBeUndefined()
  })

  it('повторный импорт того же пакета ничего не пишет и не дублирует', async () => {
    const f = fakePayload(seeded())
    const d = dir()
    await runImport(f.payload, both(), { dir: d, priceTypeId: 'pt-opt' })
    const before = structuredClone(f.db)
    const writes = f.writes.length
    const r = await runImport(f.payload, both(), { dir: d, priceTypeId: 'pt-opt' })
    expect(r).toMatchObject({ ok: true, created: 0, updated: 0, unchanged: 3, categoriesCreated: 0, categoriesLinked: 0, mediaCreated: 0 })
    expect(f.writes.length).toBe(writes)
    expect(f.db).toEqual(before)
  })

  it('manualOverride: цена, название, категория из 1С не перезаписываются', async () => {
    const init = seeded()
    init.products[0] = { ...init.products[0], guid1c: ATL, manualOverride: true, price: 999, title: 'Атлант (правка)' } as never
    const f = fakePayload(init)
    const r = await runImport(f.payload, both(), { dir: dir(), priceTypeId: 'pt-opt' })
    expect(r.ok).toBe(true)
    expect(f.db.products.find((p) => p.id === 10)).toMatchObject({ price: 999, title: 'Атлант (правка)', category: 1, stock: 5 })
    expect(f.writes.some((w) => w.collection === 'products' && w.id === 10)).toBe(false)
  })

  it('невалидный пакет не пишет ничего (ни категорий, ни картинок, ни товаров)', async () => {
    const pkg = both()
    pkg.catalog!.products[1].groupIds = ['grp-missing']
    const d = dir()
    writeFileSync(path.join(d, `${FEN}_1.jpg`), 'jpg')
    const f = fakePayload(seeded())
    const r = await runImport(f.payload, pkg, { dir: d, priceTypeId: 'pt-opt' })
    expect(r.ok).toBe(false)
    expect(r.errors.join()).toMatch(/grp-missing/)
    expect(f.writes).toEqual([])
  })

  it('артикул занят товаром с другим GUID — пакет отклонён', async () => {
    const init = seeded()
    init.products[0] = { ...init.products[0], guid1c: 'other-guid' } as never
    const f = fakePayload(init)
    const r = await runImport(f.payload, both(), { dir: dir() })
    expect(r.ok).toBe(false)
    expect(f.writes).toEqual([])
  })

  it('сбой записи посреди пакета — откат транзакции, каталог прежний', async () => {
    const f = fakePayload(seeded(), { failOn: (op, data) => op === 'create' && data.sku === 'ZP-NOPRICE' })
    const before = structuredClone(f.db)
    const r = await runImport(f.payload, both(), { dir: dir(), priceTypeId: 'pt-opt' })
    expect(r.ok).toBe(false)
    expect(r.errors.join()).toMatch(/откачена/)
    expect(r.created).toBe(0)
    expect(f.db).toEqual(before)
  })

  it('картинки: Media по filename один раз; нет файла — предупреждение, не сбой', async () => {
    const d = dir()
    writeFileSync(path.join(d, `${FEN}_1.jpg`), 'jpg')
    const f = fakePayload(seeded())
    const r1 = await runImport(f.payload, both(), { dir: d, priceTypeId: 'pt-opt' })
    expect(r1.mediaCreated).toBe(1)
    const media = f.db.media[0]
    expect(media.filename).toBe(`1c-${FEN}_1.jpg`)
    expect(f.db.products.find((p) => p.guid1c === FEN)!.gallery).toEqual([{ image: media.id }])
    const r2 = await runImport(f.payload, both(), { dir: d, priceTypeId: 'pt-opt' })
    expect(r2.mediaCreated).toBe(0)
    expect(f.db.media).toHaveLength(1)

    const f2 = fakePayload(seeded())
    const r3 = await runImport(f2.payload, both(), { dir: dir(), priceTypeId: 'pt-opt' })
    expect(r3.ok).toBe(true)
    expect(r3.warnings.join()).toMatch(/не загружена/)
  })

  it('offers.xml отдельно: цена/остаток существующего товара; неизвестный GUID — предупреждение', async () => {
    const init = seeded()
    init.products[0] = { ...init.products[0], guid1c: ATL } as never
    const f = fakePayload(init)
    const r = await runImport(f.payload, { offers: load('offers.xml').offers }, { dir: dir(), priceTypeId: 'pt-opt' })
    expect(r).toMatchObject({ ok: true, updated: 1, created: 0 })
    expect(f.db.products[0]).toMatchObject({ price: 31, stock: 280, unit: 'пар', title: 'Атлант' })
    expect(r.warnings.join()).toMatch(/нет на сайте/)
  })
})
