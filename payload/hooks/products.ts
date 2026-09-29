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
