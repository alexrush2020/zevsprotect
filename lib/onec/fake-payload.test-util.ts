import type { Payload } from 'payload'
import { protectFromImport } from '@/payload/hooks/products'

type Doc = Record<string, unknown> & { id: number }
type Coll = 'categories' | 'products' | 'media'

/**
 * In-memory Payload для тестов импорта: find/create/update + транзакция (снимок и откат).
 * Хук beforeChange товаров (protectFromImport) вызывается так же, как в коллекции Products.
 */
export function fakePayload(init: Partial<Record<Coll, Doc[]>> = {}, opts: { failOn?: (op: string, data: Record<string, unknown>) => boolean } = {}) {
  let db: Record<Coll, Doc[]> = { categories: [], products: [], media: [], ...structuredClone(init) }
  let saved: typeof db | null = null
  let nextId = 1000
  const writes: { op: string; collection: Coll; id: number; draft?: boolean; data: Record<string, unknown> }[] = []
  const match = (d: Doc, where?: Record<string, { in?: unknown[]; equals?: unknown }>) =>
    !where || Object.entries(where).every(([k, c]) => (c.in ? c.in.includes(d[k]) : d[k] === c.equals))
  const api = {
    find: async ({ collection, where }: { collection: Coll; where?: never }) => ({ docs: structuredClone(db[collection].filter((d) => match(d, where))) }),
    create: async ({ collection, data, file, context, draft }: { collection: Coll; data: Record<string, unknown>; file?: { name: string }; context?: object; draft?: boolean }) => {
      if (opts.failOn?.('create', data)) throw new Error('сбой записи (тест)')
      void context
      const doc = { ...structuredClone(data), id: nextId++, ...(file ? { filename: file.name } : {}) }
      db[collection].push(doc)
      writes.push({ op: 'create', collection, id: doc.id, draft, data })
      return structuredClone(doc)
    },
    update: async ({ collection, id, data, context, draft }: { collection: Coll; id: number; data: Record<string, unknown>; context?: { fromImport?: unknown }; draft?: boolean }) => {
      if (opts.failOn?.('update', data)) throw new Error('сбой записи (тест)')
      const doc = db[collection].find((d) => d.id === id)
      if (!doc) throw new Error(`нет ${collection}/${id}`)
      const out = collection === 'products' ? protectFromImport(data, doc, context ?? {}) : data
      Object.assign(doc, structuredClone(out))
      writes.push({ op: 'update', collection, id, draft, data })
      return structuredClone(doc)
    },
    db: {
      beginTransaction: async () => {
        saved = structuredClone(db)
        return 'tx-1'
      },
      commitTransaction: async () => {
        saved = null
      },
      rollbackTransaction: async () => {
        if (saved) db = saved
        saved = null
      },
    },
  }
  return { payload: api as unknown as Payload, get db() { return db }, writes }
}
