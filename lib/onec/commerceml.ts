import { child, decodeXml, kids, parseXml, text, XmlError, type XmlNode } from './xml'

// Разбор CommerceML 2.x (2.05–2.10, выгрузка «Обмен с сайтом» 1С КА 2): import.xml (Классификатор + Каталог)
// и offers.xml (ПакетПредложений). Чистая функция: байты → структура + ошибки. Ничего не пишет.

export type Group = { id: string; title: string; parentId?: string }
export type Prop = { name: string; value: string }
export type CatalogProduct = {
  id: string
  sku?: string
  title: string
  groupIds: string[]
  description?: string
  images: string[]
  props: Prop[]
  /** Реквизиты (ВидНоменклатуры и т.п.) — в карточку попадают только известные по имени. */
  requisites: Prop[]
}
export type PriceType = { id: string; title?: string; currency?: string; vatIncluded?: boolean }
export type OfferPrice = { typeId?: string; value?: number; raw?: string; currency?: string; unit?: string }
export type Offer = { id: string; productId: string; prices: OfferPrice[]; quantity?: number; unit?: string }

export type CmlPackage = {
  catalog?: { onlyChanges: boolean; groups: Group[]; products: CatalogProduct[] }
  offers?: { onlyChanges: boolean; priceTypes: PriceType[]; offers: Offer[] }
}

export type ParseResult = { ok: true; pkg: CmlPackage; warnings: string[] } | { ok: false; errors: string[] }

const bool = (s?: string) => s?.toLowerCase() === 'true'

/** «1 234,50» → 1234.5; мусор → NaN. */
export function parseNumber(s: string | undefined): number {
  if (s === undefined) return NaN
  const t = s.replace(/[\s ]/g, '').replace(',', '.')
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN
}

function parseGroups(node: XmlNode | undefined, parentId: string | undefined, out: Group[], errors: string[]) {
  for (const g of kids(node, 'Группа')) {
    const id = text(g, 'Ид')
    const title = text(g, 'Наименование')
    if (!id || !title) {
      errors.push(`Группа без Ид или Наименования${id ? ` (Ид ${id})` : ''}`)
      continue
    }
    out.push({ id, title, parentId })
    parseGroups(child(g, 'Группы'), id, out, errors)
  }
}

/** Свойства классификатора: Ид → имя и варианты справочника (ИдЗначения → Значение). */
function parseProps(classifier: XmlNode | undefined) {
  const props = new Map<string, { name: string; values: Map<string, string> }>()
  const list = child(classifier, 'Свойства')
  for (const p of [...kids(list, 'Свойство'), ...kids(list, 'СвойствоНоменклатуры')]) {
    const id = text(p, 'Ид')
    const name = text(p, 'Наименование')
    if (!id || !name) continue
    const values = new Map<string, string>()
    for (const v of kids(child(p, 'ВариантыЗначений'), 'Справочник')) {
      const vid = text(v, 'ИдЗначения')
      const val = text(v, 'Значение')
      if (vid && val) values.set(vid, val)
    }
    props.set(id, { name, values })
  }
  return props
}

function parseCatalog(root: XmlNode, catalog: XmlNode, errors: string[], warnings: string[]): NonNullable<CmlPackage['catalog']> {
  const classifier = child(root, 'Классификатор')
  const groups: Group[] = []
  parseGroups(child(classifier, 'Группы'), undefined, groups, errors)
  const props = parseProps(classifier)
  const products: CatalogProduct[] = []
  const goods = child(catalog, 'Товары')
  for (const t of kids(goods, 'Товар')) {
    const id = text(t, 'Ид')
    const title = text(t, 'Наименование')
    if (!id || !title) {
      errors.push(`Товар без Ид или Наименования${id ? ` (Ид ${id})` : title ? ` («${title}»)` : ''}`)
      continue
    }
    if (t.attrs['Статус'] === 'Удален' || text(t, 'Статус') === 'Удален' || bool(text(t, 'ПометкаУдаления'))) {
      warnings.push(`Товар ${id} помечен в 1С удалённым — пропущен (сайт ничего не удаляет)`)
      continue
    }
    const propValues: Prop[] = []
    for (const v of kids(child(t, 'ЗначенияСвойств'), 'ЗначенияСвойства')) {
      const pid = text(v, 'Ид')
      const p = pid ? props.get(pid) : undefined
      const raw = kids(v, 'Значение').map((x) => x.text.trim()).filter(Boolean)
      if (!raw.length) continue
      if (!p) {
        warnings.push(`Товар ${id}: свойство ${pid ?? '?'} не описано в классификаторе — пропущено`)
        continue
      }
      propValues.push({ name: p.name, value: raw.map((r) => p.values.get(r) ?? r).join(', ') })
    }
    const requisites: Prop[] = kids(child(t, 'ЗначенияРеквизитов'), 'ЗначениеРеквизита').flatMap((r) => {
      const name = text(r, 'Наименование')
      const value = text(r, 'Значение')
      return name && value ? [{ name, value }] : []
    })
    products.push({
      id,
      sku: text(t, 'Артикул'),
      title,
      groupIds: kids(child(t, 'Группы'), 'Ид').map((g) => g.text.trim()).filter(Boolean),
      description: child(t, 'Описание') ? (text(t, 'Описание') ?? '') : undefined,
      images: kids(t, 'Картинка').map((p) => p.text.trim()).filter(Boolean),
      props: propValues,
      requisites,
    })
  }
  return { onlyChanges: bool(catalog.attrs['СодержитТолькоИзменения']) || bool(text(catalog, 'СодержитТолькоИзменения')), groups, products }
}

function parseOffers(pack: XmlNode, errors: string[]): NonNullable<CmlPackage['offers']> {
  const priceTypes: PriceType[] = kids(child(pack, 'ТипыЦен'), 'ТипЦены').flatMap((pt) => {
    const id = text(pt, 'Ид')
    if (!id) return []
    const tax = child(pt, 'Налог')
    return [{ id, title: text(pt, 'Наименование'), currency: text(pt, 'Валюта'), vatIncluded: tax ? bool(text(tax, 'УчтеноВСумме')) : undefined }]
  })
  const offers: Offer[] = []
  for (const o of kids(child(pack, 'Предложения'), 'Предложение')) {
    const id = text(o, 'Ид')
    if (!id) {
      errors.push('Предложение без Ид')
      continue
    }
    const prices: OfferPrice[] = kids(child(o, 'Цены'), 'Цена').map((p) => {
      const raw = text(p, 'ЦенаЗаЕдиницу')
      const value = parseNumber(raw)
      if (raw !== undefined && Number.isNaN(value)) errors.push(`Предложение ${id}: цена «${raw}» не число`)
      return { typeId: text(p, 'ИдТипаЦены'), value: Number.isNaN(value) ? undefined : value, raw, currency: text(p, 'Валюта'), unit: text(p, 'Единица') }
    })
    let quantity: number | undefined
    const q = text(o, 'Количество')
    if (q !== undefined) {
      quantity = parseNumber(q)
      if (Number.isNaN(quantity)) errors.push(`Предложение ${id}: количество «${q}» не число`)
    } else {
      // без общего Количества — сумма по складам (2.08+: <Склад ИдСклада КоличествоНаСкладе/>)
      const byStore = kids(o, 'Склад').map((s) => parseNumber(s.attrs['КоличествоНаСкладе'])).filter((n) => !Number.isNaN(n))
      if (byStore.length) quantity = byStore.reduce((a, b) => a + b, 0)
    }
    offers.push({ id, productId: id.split('#')[0], prices, quantity, unit: text(o, 'БазоваяЕдиница') ?? prices[0]?.unit })
  }
  return { onlyChanges: bool(pack.attrs['СодержитТолькоИзменения']) || bool(text(pack, 'СодержитТолькоИзменения')), priceTypes, offers }
}

export function parseCommerceMl(buf: Uint8Array): ParseResult {
  let root: XmlNode
  try {
    root = parseXml(decodeXml(buf))
  } catch (e) {
    return { ok: false, errors: [`XML не разобран: ${e instanceof XmlError ? e.message : String(e)}`] }
  }
  if (root.name !== 'КоммерческаяИнформация') return { ok: false, errors: [`Корневой элемент <${root.name}>, ожидался <КоммерческаяИнформация>`] }
  const errors: string[] = []
  const warnings: string[] = []
  const pkg: CmlPackage = {}
  const catalog = child(root, 'Каталог')
  const pack = child(root, 'ПакетПредложений') ?? child(root, 'ИзмененияПакетаПредложений')
  if (catalog) pkg.catalog = parseCatalog(root, catalog, errors, warnings)
  else if (child(root, 'Классификатор')) {
    // import.xml только с классификатором: группы без товаров
    const groups: Group[] = []
    parseGroups(child(child(root, 'Классификатор'), 'Группы'), undefined, groups, errors)
    pkg.catalog = { onlyChanges: true, groups, products: [] }
  }
  if (pack) pkg.offers = parseOffers(pack, errors)
  if (!pkg.catalog && !pkg.offers) errors.push('В файле нет ни Каталога, ни ПакетаПредложений')
  return errors.length ? { ok: false, errors } : { ok: true, pkg, warnings }
}
