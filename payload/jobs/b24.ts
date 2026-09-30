import { JobCancelledError, type Endpoint, type TaskConfig } from 'payload'
import { hasRole } from '../access'
import { B24Error, getB24Client } from '@/lib/b24/client'
import { B24_TARGET, B24_TASK, isB24Kind, retryB24Sync, runB24Sync } from '@/lib/b24/sync'
// Исполнители регистрируются импортом модуля здесь (не в lib/b24/sync.ts — там был бы цикл импортов)
import '@/lib/b24/company'
import '@/lib/b24/deal'
import '@/lib/b24/lead'

/** 30 с · 2^n, 8 повторов: последний ~через 64 мин, всего ~2 ч; дальше — кнопка «Отправить в Б24 повторно». */
export const B24_RETRIES = { attempts: 8, backoff: { type: 'exponential' as const, delay: 30_000 } }

export const b24SyncTask: TaskConfig<typeof B24_TASK> = {
  slug: B24_TASK,
  label: 'Отправка в Битрикс24',
  inputSchema: [
    { name: 'kind', type: 'select', required: true, options: Object.keys(B24_TARGET) },
    { name: 'id', type: 'text', required: true },
  ],
  outputSchema: [
    { name: 'status', type: 'text', required: true },
    { name: 'b24Id', type: 'text' },
  ],
  retries: B24_RETRIES,
  // один документ — одна отправка за раз; повторная постановка вытесняет ждущую копию
  concurrency: { key: ({ input }) => `b24:${input.kind}:${input.id}`, exclusive: true, supersedes: true },
  handler: async ({ input, req }) => {
    try {
      // без req: syncError должен сохраниться, даже когда задача упадёт
      return { output: await runB24Sync({ kind: input.kind, id: input.id, payload: req.payload, b24: getB24Client() }) }
    } catch (err) {
      if (err instanceof B24Error && !err.retryable) throw new JobCancelledError(err.message)
      throw err
    }
  },
}

const staff = hasRole('admin', 'manager')

/** POST /api/b24/retry {kind, id} — «Отправить в Б24 повторно». Идемпотентен: при заполненном b24-id ничего не ставит. */
export const b24RetryEndpoint: Endpoint = {
  path: '/b24/retry',
  method: 'post',
  handler: async (req) => {
    if (!staff({ req })) return Response.json({ message: 'Недостаточно прав' }, { status: 403 })
    const body = (await req.json?.().catch(() => null)) as { kind?: unknown; id?: unknown } | null
    const id = body?.id
    if (!isB24Kind(body?.kind) || !(typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id))))
      return Response.json({ message: 'Нужны kind (order|lead|company) и id' }, { status: 400 })
    const result = await retryB24Sync(req.payload, body.kind, id)
    const status = result.status === 'not_found' ? 404 : result.status === 'failed' ? 503 : 200
    return Response.json(result, { status })
  },
}
