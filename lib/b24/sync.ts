import type { Payload } from 'payload'
import type { Customer, Lead, Order } from '@/payload/payload-types'
import { B24Error, type B24Client } from './client'
import { B24_TARGET, syncedId, type B24Kind } from './target'

// Ядро отправки документов в Б24: идемпотентность по b24-id документа, syncError, реестр исполнителей.
// Сам job — payload/jobs/b24.ts; исполнители сделки/лида/компании регистрируются своими карточками.

export { B24_TARGET, isB24Kind, type B24Kind } from './target'
type Docs = { order: Order; lead: Lead; company: Customer }

/**
 * Исполнитель: создаёт сущность в Б24 и возвращает её ID (он запишется в документ) либо null — «отправлять нечего».
 * Контракт: вызывается, только если у документа ещё нет b24-id; ошибки Б24 — пробрасывать как есть (B24Error),
 * повтор и syncError делает обёртка. Если ID сохранить не удалось, job повторится — исполнитель, создающий
 * несколько сущностей, должен сам не плодить дубли (ORIGIN_ID/поиск по list перед add).
 */
export type B24Handler<K extends B24Kind> = (args: { doc: Docs[K]; b24: B24Client; payload: Payload }) => Promise<string | number | null>

const handlers: { [K in B24Kind]?: B24Handler<K> } = {}

export function registerB24Handler<K extends B24Kind>(kind: K, fn: B24Handler<K>) {
  ;(handlers as Record<K, B24Handler<K>>)[kind] = fn
}

export type B24SyncResult = { status: 'sent' | 'already' | 'skipped'; b24Id?: string }

type SyncPatch = { b24Id?: string; syncError: string | null }

async function patchDoc(payload: Payload, kind: B24Kind, id: string | number, patch: SyncPatch) {
  const { collection, field } = B24_TARGET[kind]
  const data: Record<string, string | null> = { syncError: patch.syncError }
  if (patch.b24Id !== undefined) data[field] = patch.b24Id
  // техническая запись — не повод заново выгружать заказ в 1С (страховка к сравнению полей в Orders.beforeChange)
  await payload.update({ collection, id, data, depth: 0, overrideAccess: true, context: { skipOnecReset: true } })
}

export async function runB24Sync(args: { kind: B24Kind; id: string | number; payload: Payload; b24: B24Client }): Promise<B24SyncResult> {
  const { kind, id, payload, b24 } = args
  const { collection } = B24_TARGET[kind]
  const doc = (await payload.findByID({ collection, id, depth: 0, overrideAccess: true, disableErrors: true })) as Docs[B24Kind] | null
  // документ мог ещё не закоммититься (job поставлен из afterChange до коммита) — повторим позже
  if (!doc) throw new B24Error(`Документ ${collection}/${id} не найден`, true, 'NOT_FOUND')
  const existing = syncedId(kind, doc)
  if (existing) return { status: 'already', b24Id: existing }

  const handler = handlers[kind] as B24Handler<B24Kind> | undefined
  if (!handler) {
    payload.logger.info({ msg: `Б24: исполнитель «${kind}» не подключён, ${collection}/${id} пропущен` })
    return { status: 'skipped' }
  }

  let b24Id: string | number | null
  try {
    b24Id = await handler({ doc, b24, payload })
  } catch (err) {
    const e = err instanceof B24Error ? err : new B24Error(err instanceof Error ? err.message : String(err), true, 'HANDLER')
    await patchDoc(payload, kind, id, { syncError: e.retryable ? `${e.message} — повтор по расписанию` : e.message }).catch((writeErr) =>
      payload.logger.error({ err: writeErr, msg: `Б24: не записать syncError в ${collection}/${id}` }),
    )
    throw e
  }
  if (b24Id == null) return { status: 'skipped' }
  await patchDoc(payload, kind, id, { b24Id: String(b24Id), syncError: null })
  return { status: 'sent', b24Id: String(b24Id) }
}

export const B24_TASK = 'b24-sync'

/** Поставить отправку в очередь. Никогда не бросает: сбой постановки не должен ломать заказ/заявку. */
export async function enqueueB24Sync(payload: Payload, kind: B24Kind, id: string | number): Promise<boolean> {
  try {
    // без req: вне транзакции вызывающего — ошибка вставки job не должна откатить заказ
    await payload.jobs.queue({ task: B24_TASK, input: { kind, id: String(id) } })
    return true
  } catch (err) {
    const { collection } = B24_TARGET[kind]
    payload.logger.error({ err, msg: `Б24: не удалось поставить в очередь ${collection}/${id}` })
    await patchDoc(payload, kind, id, { syncError: 'Не поставлено в очередь Б24 — отправьте повторно' }).catch(() => undefined)
    return false
  }
}

/** Ручной повтор из админки: не создаёт дубль, если b24-id уже есть. */
export async function retryB24Sync(payload: Payload, kind: B24Kind, id: string | number): Promise<B24SyncResult | { status: 'queued' | 'failed' | 'not_found' }> {
  const { collection } = B24_TARGET[kind]
  const doc = await payload.findByID({ collection, id, depth: 0, overrideAccess: true, disableErrors: true })
  if (!doc) return { status: 'not_found' }
  const existing = syncedId(kind, doc)
  if (existing) return { status: 'already', b24Id: existing }
  return { status: (await enqueueB24Sync(payload, kind, id)) ? 'queued' : 'failed' }
}
