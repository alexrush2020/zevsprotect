import path from 'node:path'
import { readFile } from 'node:fs/promises'
import type { Payload } from 'payload'
import { protectFromImport } from '@/payload/hooks/products'
import { validateKnitClass } from '@/payload/validators'
import { lexicalToParagraphs } from '@/lib/server/map'
import { slugify, splitParagraphs, toLexical } from '@/lib/seed/map'
import type { CmlPackage, Prop } from './commerceml'

// Применение разобранного пакета CommerceML к каталогу Payload.
// Порядок: снимок БД → план (чистая функция, все ошибки до записи) → картинки → одна транзакция на категории и товары.

type Id = number
type Doc = Record<string, unknown> & { id: Id }

export type CategorySnap = { id: Id; title: string; slug: string; guid1c?: string | null }
export type ProductSnap = Doc & { guid1c?: string | null; sku?: string | null; slug?: string | null; _status?: string | null; manualOverride?: boolean | null }
export type Snapshot = { categories: CategorySnap[]; products: ProductSnap[] }

type CatRef = { id: Id } | { group: string }
export type CategoryOp = { op: 'create'; group: string; title: string; slug: string; parent?: CatRef } | { op: 'link'; id: Id; group: string }
export type ProductOp = {
  op: 'create' | 'update'
  id?: Id
  guid1c: string
  /** Поля документа (description — текстом, конвертируется в Lexical при записи). */
  data: Record<string, unknown>
  category?: CatRef
  images?: string[]
  label: string
}
export type Plan = { categories: CategoryOp[]; products: ProductOp[]; errors: string[]; warnings: string[]; notes: string[] }

/** Свойство/реквизит 1С → поле товара (по имени, без учёта регистра). Остальные свойства — в specs. */
const FIELD_BY_NAME: Record<string, 'base' | 'coating' | 'coatingType' | 'colors' | 'sizes' | 'knitClass' | 'tex' | 'weight' | 'length'> = {
  основа: 'base',
  покрытие: 'coating',
  'вид покрытия': 'coatingType',
  цвет: 'colors',
  цвета: 'colors',
  размер: 'sizes',
  размеры: 'sizes',
  'класс вязки': 'knitClass',
  текс: 'tex',
  'вес пары': 'weight',
  'длина модели': 'length',
  длина: 'length',
}
const LIST_FIELDS = new Set(['colors', 'sizes'])
const RUB = new Set(['rub', 'руб', 'руб.', '643', 'rur'])

export type PlanOptions = { priceTypeId?: string }

function mapProps(label: string, props: Prop[], requisites: Prop[], warnings: string[]) {
  const data: Record<string, unknown> = {}
  const specs: { key: string; value: string }[] = []
  const put = (p: Prop, toSpecs: boolean) => {
    const field = FIELD_BY_NAME[p.name.trim().toLowerCase()]
    if (field === 'knitClass' && validateKnitClass(p.value) !== true) {
      warnings.push(`${label}: класс вязки «${p.value}» вне правила сайта — записан в характеристики`)
      specs.push({ key: p.name, value: p.value })
    } else if (field) data[field] = LIST_FIELDS.has(field) ? p.value.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : p.value
    else if (toSpecs) specs.push({ key: p.name, value: p.value })
  }
  props.forEach((p) => put(p, true))
  // служебные реквизиты (ВидНоменклатуры, ТипНоменклатуры…) на витрину не выводим
  requisites.forEach((p) => put(p, false))
  if (specs.length) data.specs = specs
  return data
}

/** Чистый план импорта: что создать/обновить. Ошибки → пакет не применяется целиком. */
export function planImport(pkg: CmlPackage, snap: Snapshot, opts: PlanOptions = {}): Plan {
  const errors: string[] = []
  const warnings: string[] = []
  const notes: string[] = []
  const categories: CategoryOp[] = []
  const byGuid = new Map(snap.products.filter((p) => p.guid1c).map((p) => [p.guid1c as string, p]))
  const bySku = new Map(snap.products.filter((p) => p.sku).map((p) => [p.sku as string, p]))
  const takenSlugs = new Set([...snap.products.map((p) => p.slug), ...snap.categories.map((c) => `cat:${c.slug}`)])
  const uniqueSlug = (base: string, prefix = '') => {
    let s = base || 'tovar'
    for (let n = 2; takenSlugs.has(prefix + s); n++) s = `${base}-${n}`
    takenSlugs.add(prefix + s)
    return s
  }

  // --- группы → категории: по guid1c, иначе по названию (связываем), иначе создаём
  const groupCat = new Map<string, CatRef>()
  for (const c of snap.categories) if (c.guid1c) groupCat.set(c.guid1c, { id: c.id })
  const catByTitle = new Map(snap.categories.filter((c) => !c.guid1c).map((c) => [c.title.trim().toLowerCase(), c]))
  for (const g of pkg.catalog?.groups ?? []) {
    if (groupCat.has(g.id)) continue
    const same = catByTitle.get(g.title.trim().toLowerCase())
    if (same) {
      catByTitle.delete(g.title.trim().toLowerCase())
      categories.push({ op: 'link', id: same.id, group: g.id })
      groupCat.set(g.id, { id: same.id })
    } else {
      categories.push({ op: 'create', group: g.id, title: g.title, slug: uniqueSlug(slugify(g.title), 'cat:'), parent: g.parentId ? groupCat.get(g.parentId) : undefined })
      groupCat.set(g.id, { group: g.id })
    }
  }

  // --- товары
  const ops = new Map<string, ProductOp>()
  const seenSku = new Map<string, string>()
  for (const p of pkg.catalog?.products ?? []) {
    const label = `Товар «${p.title}» (${p.id})`
    if (ops.has(p.id)) {
      errors.push(`${label}: Ид повторяется в файле`)
      continue
    }
    if (p.sku) {
      const other = seenSku.get(p.sku)
      if (other) errors.push(`${label}: артикул ${p.sku} уже у товара ${other} в этом файле`)
      seenSku.set(p.sku, p.id)
    }
    let existing = byGuid.get(p.id)
    const data: Record<string, unknown> = { title: p.title, ...mapProps(label, p.props, p.requisites, warnings) }
    if (!existing && p.sku) {
      const bySkuDoc = bySku.get(p.sku)
      if (bySkuDoc?.guid1c) {
        errors.push(`${label}: артикул ${p.sku} уже у товара с другим GUID 1С (${bySkuDoc.guid1c})`)
        continue
      }
      if (bySkuDoc) {
        existing = bySkuDoc
        data.guid1c = p.id // первая выгрузка: связываем товар, заведённый на сайте, с номенклатурой 1С
      }
    }
    if (p.sku) data.sku = p.sku
    if (p.description !== undefined) data.description = p.description
    const category = p.groupIds.map((g) => groupCat.get(g)).find(Boolean)
    if (p.groupIds.length && !category) {
      errors.push(`${label}: группа ${p.groupIds.join(', ')} не найдена ни в файле, ни на сайте`)
      continue
    }
    if (existing) {
      ops.set(p.id, { op: 'update', id: existing.id, guid1c: p.id, data, category, images: p.images.length ? p.images : undefined, label })
    } else {
      if (!p.sku) errors.push(`${label}: нет Артикула — новый товар на сайте без артикула не создать`)
      if (!category) errors.push(`${label}: нет группы — новому товару нужна категория`)
      ops.set(p.id, {
        op: 'create',
        guid1c: p.id,
        data: { ...data, guid1c: p.id, slug: uniqueSlug(slugify(p.title)) },
        category,
        images: p.images,
        label,
      })
    }
  }

  // --- предложения: цена, остаток, единица
  const offers = pkg.offers
  if (offers) {
    const { priceTypeId } = opts
    const types = new Map(offers.priceTypes.map((t) => [t.id, t]))
    if (priceTypeId && offers.priceTypes.length && !types.has(priceTypeId))
      errors.push(`Тип цены ONEC_PRICE_TYPE_ID=${priceTypeId} не найден в пакете (есть: ${offers.priceTypes.map((t) => `${t.id} «${t.title ?? ''}»`).join(', ')})`)
    if (!priceTypeId)
      notes.push('ДОПУЩЕНИЕ: ONEC_PRICE_TYPE_ID не задан — взята первая цена каждого предложения; НДС не пересчитывается (BIZ-8)')
    const byProduct = new Map<string, typeof offers.offers>()
    for (const o of offers.offers) byProduct.set(o.productId, [...(byProduct.get(o.productId) ?? []), o])
    for (const [productId, list] of byProduct) {
      const label = `Предложение ${productId}`
      let op = ops.get(productId)
      if (!op) {
        const existing = byGuid.get(productId)
        if (!existing) {
          warnings.push(`${label}: товара с таким GUID нет на сайте и в пакете — пропущено`)
          continue
        }
        op = { op: 'update', id: existing.id, guid1c: productId, data: {}, label }
        ops.set(productId, op)
      }
      const values: number[] = []
      for (const o of list) {
        const price = priceTypeId ? o.prices.find((p) => p.typeId === priceTypeId) : o.prices[0]
        if (!priceTypeId && o.prices.length > 1) warnings.push(`${o.id}: несколько цен, взята первая (тип ${o.prices[0].typeId ?? '?'})`)
        const type = price?.typeId ? types.get(price.typeId) : undefined
        const currency = price?.currency ?? type?.currency
        if (currency && !RUB.has(currency.toLowerCase())) {
          errors.push(`${o.id}: валюта цены ${currency}, ожидались рубли`)
          continue
        }
        if (type?.vatIncluded === false) warnings.push(`${o.id}: тип цены «${type.title ?? type.id}» без НДС в сумме — записана как есть`)
        // CONTRA-9: нет цены (или 0) — поле price не трогаем, а не пишем ноль
        if (price?.value === undefined || price.value <= 0) warnings.push(`${o.id}: нет цены${priceTypeId ? ` типа ${priceTypeId}` : ''} — цена на сайте не меняется`)
        else values.push(price.value)
      }
      if (values.length && values.every((v) => v === values[0])) op.data.price = values[0]
      else if (values.length) warnings.push(`${label}: у характеристик разные цены (${values.join(', ')}) — цена не записана`)
      const qty = list.map((o) => o.quantity).filter((q): q is number => q !== undefined)
      // отрицательный остаток 1С (резерв сверх наличия) на сайте = 0
      if (qty.length) op.data.stock = Math.max(0, qty.reduce((a, b) => a + b, 0))
      const unit = list.find((o) => o.unit)?.unit
      if (unit) op.data.unit = unit
    }
  }
  return { categories, products: [...ops.values()], errors, warnings, notes }
}

// ---------- сравнение для идемпотентности ----------

const idOf = (v: unknown) => (v && typeof v === 'object' ? (v as { id: unknown }).id : v)

function normalize(field: string, v: unknown): unknown {
  if (v === undefined || v === null || v === '') return null
  if (field === 'description') return typeof v === 'string' ? splitParagraphs(v).join('\n\n') : lexicalToParagraphs(v).join('\n\n')
  if (field === 'category') return idOf(v)
  if (field === 'gallery') return (v as { image: unknown }[]).map((r) => idOf(r.image))
  if (field === 'specs') return (v as { key: string; value: string }[]).map((r) => [r.key, r.value])
  if (Array.isArray(v) && !v.length) return null
  return v
}

/** Поля data, отличающиеся от документа — с учётом manualOverride (protectFromImport, как в хуке beforeChange). */
export function changedFields(data: Record<string, unknown>, existing: Record<string, unknown>): string[] {
  const effective = protectFromImport(data, existing, { fromImport: true })
  return Object.keys(data).filter((k) => JSON.stringify(normalize(k, effective[k])) !== JSON.stringify(normalize(k, existing[k])))
}

// ---------- запись ----------

export type ImportReport = {
  ok: boolean
  errors: string[]
  warnings: string[]
  notes: string[]
  created: number
  updated: number
  unchanged: number
  categoriesCreated: number
  categoriesLinked: number
  mediaCreated: number
}

const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }
/** Имя в Media — ключ идемпотентности картинок 1С (upsert по filename, как в seed). */
export const mediaNameFor = (xmlPath: string) => `1c-${path.basename(xmlPath.replace(/\\/g, '/'))}`

export type ImportOptions = PlanOptions & { dir: string }

async function loadSnapshot(payload: Payload): Promise<Snapshot> {
  const [cats, prods] = await Promise.all([
    payload.find({ collection: 'categories', pagination: false, depth: 0, overrideAccess: true }),
    // draft: true — последняя версия (в т.ч. неопубликованный черновик): её же видит хук beforeChange
    payload.find({ collection: 'products', pagination: false, depth: 0, draft: true, overrideAccess: true }),
  ])
  return { categories: cats.docs as unknown as CategorySnap[], products: prods.docs as unknown as ProductSnap[] }
}

export async function runImport(payload: Payload, pkg: CmlPackage, opts: ImportOptions): Promise<ImportReport> {
  const report: ImportReport = { ok: false, errors: [], warnings: [], notes: [], created: 0, updated: 0, unchanged: 0, categoriesCreated: 0, categoriesLinked: 0, mediaCreated: 0 }
  const snap = await loadSnapshot(payload)
  const plan = planImport(pkg, snap, opts)
  report.warnings.push(...plan.warnings)
  report.notes.push(...plan.notes)
  if (plan.errors.length) {
    report.errors = plan.errors
    return report
  }

  // 1. Картинки — до транзакции и вне её: файл на диске откатом не удалить, а повтор с тем же filename
  //    дал бы Payload-дубликат «name-1.jpg». Upsert по filename идемпотентен сам по себе.
  const mediaId = new Map<string, Id>()
  const names = [...new Set(plan.products.flatMap((p) => p.images ?? []).map(mediaNameFor))]
  if (names.length) {
    const found = await payload.find({ collection: 'media', where: { filename: { in: names } }, pagination: false, depth: 0, overrideAccess: true })
    for (const m of found.docs) mediaId.set(m.filename as string, m.id as Id)
  }
  const titleOf = (name: string) => plan.products.find((p) => p.images?.some((i) => mediaNameFor(i) === name))?.data.title
  for (const name of names) {
    if (mediaId.has(name)) continue
    const mimetype = MIME[path.extname(name).toLowerCase()]
    let data: Buffer
    try {
      if (!mimetype) throw new Error('формат не поддерживается')
      data = await readFile(path.join(opts.dir, name.slice(3)))
    } catch (e) {
      report.warnings.push(`Картинка ${name.slice(3)} не загружена: ${e instanceof Error ? e.message : e}`)
      continue
    }
    const alt = String(titleOf(name) ?? name)
    const doc = await payload.create({ collection: 'media', data: { alt, title: alt }, file: { data, mimetype, name, size: data.length }, overrideAccess: true })
    mediaId.set(name, doc.id)
    report.mediaCreated++
  }

  // 2. Категории и товары — одна транзакция на пакет: ошибка любой записи откатывает всё.
  const transactionID = (await payload.db.beginTransaction?.()) ?? undefined
  const req = transactionID ? { transactionID } : undefined
  const context = { fromImport: true }
  const catId = new Map<string, Id>()
  const resolve = (ref?: CatRef) => (ref ? ('id' in ref ? ref.id : catId.get(ref.group)) : undefined)
  const snapById = new Map(snap.products.map((p) => [p.id, p]))
  try {
    for (const c of plan.categories) {
      if (c.op === 'link') {
        await payload.update({ collection: 'categories', id: c.id, data: { guid1c: c.group }, overrideAccess: true, context, req })
        catId.set(c.group, c.id)
        report.categoriesLinked++
      } else {
        const doc = await payload.create({ collection: 'categories', data: { title: c.title, slug: c.slug, guid1c: c.group, parent: resolve(c.parent) }, overrideAccess: true, context, req })
        catId.set(c.group, doc.id)
        report.categoriesCreated++
      }
    }
    for (const p of plan.products) {
      const data: Record<string, unknown> = { ...p.data }
      const category = resolve(p.category)
      if (category !== undefined) data.category = category
      if (p.images) {
        const ids = p.images.map((i) => mediaId.get(mediaNameFor(i))).filter((x): x is Id => x !== undefined)
        if (ids.length || p.op === 'create') data.gallery = ids.map((image) => ({ image }))
      }
      if (p.op === 'create') {
        const description = typeof data.description === 'string' ? toLexical(splitParagraphs(data.description)) : undefined
        // Новые товары — черновиком: карточку проверяет и публикует контент-менеджер (фото, тексты, SEO)
        await payload.create({ collection: 'products', data: { ...data, description, _status: 'draft' } as never, draft: true, overrideAccess: true, context, req })
        report.created++
        continue
      }
      const existing = snapById.get(p.id as Id)!
      const changed = changedFields(data, existing)
      if (!changed.length) {
        report.unchanged++
        continue
      }
      const patch = Object.fromEntries(changed.map((k) => [k, k === 'description' && typeof data[k] === 'string' ? toLexical(splitParagraphs(data[k] as string)) : data[k]]))
      // статус сохраняется: опубликованный — обновляется опубликованным, черновик остаётся черновиком
      const isDraft = existing._status === 'draft'
      if (isDraft) report.warnings.push(`${p.label}: последняя версия — черновик, изменения 1С сохранены в черновик`)
      await payload.update({ collection: 'products', id: existing.id, data: patch, draft: isDraft, overrideAccess: true, context, req })
      report.updated++
    }
    if (transactionID) await payload.db.commitTransaction(transactionID)
  } catch (e) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    const applied = report.created + report.updated + report.categoriesCreated + report.categoriesLinked
    report.errors.push(
      `Ошибка записи: ${e instanceof Error ? e.message : String(e)}. ` +
        (transactionID ? 'Транзакция откачена, каталог не изменён.' : `Транзакции нет — применено записей: ${applied}.`),
    )
    if (transactionID) report.created = report.updated = report.categoriesCreated = report.categoriesLinked = 0
    return report
  }
  report.ok = true
  return report
}
