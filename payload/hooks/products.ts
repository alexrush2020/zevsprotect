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

type Lockable = { guid1c?: unknown; manualOverride?: unknown }

/** Блокировка для field-access update: guid1c — из текущего документа, manualOverride — из тела запроса, иначе из документа. */
export function isPriceLockedFor({ doc, data }: { doc?: Lockable; data?: Lockable }): boolean {
  if (!doc) return false
  return isPriceLocked({
    guid1c: doc.guid1c,
    manualOverride: data && 'manualOverride' in data ? data.manualOverride : doc.manualOverride,
  })
}
