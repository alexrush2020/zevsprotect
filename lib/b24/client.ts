// Тонкий клиент REST Битрикс24 по входящему вебхуку (B24_WEBHOOK_URL = https://<портал>/rest/<user>/<секрет>/).
// URL вебхука содержит секрет — в сообщения ошибок и логи он не попадает.

export class B24Error extends Error {
  constructor(
    message: string,
    /** true — временный сбой (сеть, 5xx, 429, лимит частоты): job повторит; false — повтор бесполезен. */
    readonly retryable: boolean,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'B24Error'
  }
}

export type B24Params = Record<string, unknown>

export type B24Client = {
  readonly enabled: boolean
  call<T = unknown>(method: string, params?: B24Params): Promise<T>
}

type Options = {
  webhookUrl?: string
  fetch?: typeof fetch
  timeoutMs?: number
  /** Б24 держит ~2 запроса/с на портал. */
  minIntervalMs?: number
}

// Коды Б24, при которых имеет смысл повторить позже.
const RETRYABLE_CODES = new Set(['QUERY_LIMIT_EXCEEDED', 'INTERNAL_SERVER_ERROR', 'ERROR_SERVER', 'OVERLOAD_LIMIT'])

type B24Body = { result?: unknown; error?: unknown; error_description?: unknown }

/** Разбор ответа Б24: результат или B24Error с признаком retryable. Чистая функция. */
export function parseB24Response(status: number, body: B24Body | null): unknown {
  const transient = status >= 500 || status === 429
  if (body && body.error) {
    const code = String(body.error)
    const desc = typeof body.error_description === 'string' && body.error_description ? `: ${body.error_description}` : ''
    throw new B24Error(`Б24 ${code}${desc}`, transient || RETRYABLE_CODES.has(code), code, status)
  }
  if (transient) throw new B24Error(`Б24 недоступен (HTTP ${status})`, true, 'HTTP', status)
  if (status < 200 || status >= 300) throw new B24Error(`Б24 отклонил запрос (HTTP ${status})`, false, 'HTTP', status)
  // 200 без result — чаще всего страница-заглушка обслуживания портала
  if (!body || !('result' in body)) throw new B24Error('Б24 вернул непонятный ответ', true, 'BAD_RESPONSE', status)
  return body.result
}

export function createB24Client(opts: Options = {}): B24Client {
  const base = opts.webhookUrl?.trim().replace(/\/+$/, '') ?? ''
  const doFetch = opts.fetch ?? fetch
  const timeoutMs = opts.timeoutMs ?? 15_000
  const minIntervalMs = opts.minIntervalMs ?? 500
  let nextSlot = 0

  // ponytail: троттлинг в пределах процесса; при нескольких инстансах приложения — общий лимитер (Redis/advisory lock)
  async function throttle() {
    const now = Date.now()
    const at = Math.max(now, nextSlot)
    nextSlot = at + minIntervalMs
    if (at > now) await new Promise((r) => setTimeout(r, at - now))
  }

  return {
    enabled: !!base,
    async call<T>(method: string, params: B24Params = {}): Promise<T> {
      if (!base) throw new B24Error('Интеграция с Б24 выключена: не задан B24_WEBHOOK_URL', false, 'DISABLED')
      await throttle()
      let res: Response
      try {
        res = await doFetch(`${base}/${method}.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(params),
          signal: AbortSignal.timeout(timeoutMs),
        })
      } catch (err) {
        // текст исходной ошибки не пробрасываем: в нём бывает URL с секретом
        const timeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
        throw timeout
          ? new B24Error(`Б24 не ответил за ${timeoutMs} мс (${method})`, true, 'TIMEOUT')
          : new B24Error(`Нет связи с Б24 (${method})`, true, 'NETWORK')
      }
      const body = (await res.json().catch(() => null)) as B24Body | null
      return parseB24Response(res.status, body) as T
    },
  }
}

let shared: B24Client | undefined
/** Общий клиент процесса из env (один троттлинг на все jobs). */
export const getB24Client = (): B24Client => (shared ??= createB24Client({ webhookUrl: process.env.B24_WEBHOOK_URL }))
