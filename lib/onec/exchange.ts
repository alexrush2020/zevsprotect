import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { appendFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { Payload } from 'payload'
import { parseCommerceMl } from './commerceml'
import { runImport, type ImportReport } from './import'
import { loadOrdersToExport, markExported, ordersXml, type ExportSnapshot } from './orders-export'

// Протокол «Обмен с сайтом» 1С (совместим с 1С-Битрикс /bitrix/admin/1c_exchange.php):
//   checkauth → «success\n<cookie>\n<значение>»;  init → «zip=no\nfile_limit=N» (общие для type=catalog и type=sale);
//   catalog: file (POST, тело — часть файла, дописывается) → «success»;  import&filename=… → «success» | «failure\n…».
//   sale: query → XML заказов (orders-export.ts), снимок отданного — в каталоге сессии;  success → пометка снимка.

export const SESSION_COOKIE = 'ZEVS_1C_SESSION'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000
/** Потолок размера файла пакета (сумма частей): картинки; XML — ONEC_EXCHANGE_XML_LIMIT (разбирается в памяти). */
const MAX_FILE_BYTES = 200 * 1024 * 1024
/** Заказов за один query; остаток уходит следующим обменом. */
const SALE_LIMIT = 500
const isXml = (name: string) => /\.xml$/i.test(name)
const ALLOWED_EXT = /\.(xml|jpe?g|png|webp)$/i

export function onecConfig(env: NodeJS.ProcessEnv = process.env) {
  const limit = Number(env.ONEC_EXCHANGE_FILE_LIMIT)
  const xmlLimit = Number(env.ONEC_EXCHANGE_XML_LIMIT)
  return {
    xmlLimit: Number.isInteger(xmlLimit) && xmlLimit > 0 ? xmlLimit : 50 * 1024 * 1024,
    user: env.ONEC_EXCHANGE_USER?.trim() || undefined,
    password: env.ONEC_EXCHANGE_PASSWORD || undefined,
    dir: env.ONEC_EXCHANGE_DIR?.trim() || path.join(tmpdir(), 'zevs-1c'),
    fileLimit: Number.isInteger(limit) && limit > 0 ? limit : 10 * 1024 * 1024,
    priceTypeId: env.ONEC_PRICE_TYPE_ID?.trim() || undefined,
  }
}

const digest = (s: string) => createHash('sha256').update(s).digest()
/** Сравнение за постоянное время независимо от длины (через хэши). */
const safeEqual = (a: string, b: string) => timingSafeEqual(digest(a), digest(b))

export function checkBasic(header: string | null, user: string, password: string): boolean {
  const m = /^Basic\s+(\S+)$/i.exec(header ?? '')
  if (!m) return false
  const decoded = Buffer.from(m[1], 'base64').toString('utf8')
  const i = decoded.indexOf(':')
  if (i < 0) return false
  // оба сравнения всегда выполняются — без раннего выхода
  const okUser = safeEqual(decoded.slice(0, i), user)
  const okPass = safeEqual(decoded.slice(i + 1), password)
  return okUser && okPass
}

const sign = (payload: string, user: string, password: string) => createHmac('sha256', `${user}\n${password}`).update(payload).digest('hex')

/** Сессия без хранилища: «срок.id.подпись». id — имя каталога файлов этой сессии. */
export function issueSession(user: string, password: string, now = Date.now()): { token: string; id: string } {
  const id = randomBytes(16).toString('hex')
  const body = `${now + SESSION_TTL_MS}.${id}`
  return { token: `${body}.${sign(body, user, password)}`, id }
}

export function verifySession(cookieHeader: string | null, user: string, password: string, now = Date.now()): string | null {
  const raw = cookieHeader
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1)
  const m = /^(\d+)\.([0-9a-f]{32})\.([0-9a-f]{64})$/.exec(raw ?? '')
  if (!m) return null
  if (!safeEqual(m[3], sign(`${m[1]}.${m[2]}`, user, password))) return null
  return Number(m[1]) > now ? m[2] : null
}

/** Имя файла от 1С → безопасное basename (без каталогов) с разрешённым расширением, иначе null. */
export function safeFileName(name: string | null): string | null {
  const base = (name ?? '').split(/[\\/]/).pop() ?? ''
  if (!base || base.startsWith('.') || base.length > 200 || /[\x00-\x1f]/.test(base) || !ALLOWED_EXT.test(base)) return null
  return base
}

const reply = (body: string, status = 200, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...headers } })
const failure = (msg: string, status = 200) => reply(`failure\n${msg}`, status)

export function summary(r: ImportReport): string {
  return [
    `товары: создано ${r.created}, обновлено ${r.updated}, без изменений ${r.unchanged}`,
    `категории: создано ${r.categoriesCreated}, связано ${r.categoriesLinked}; картинок загружено ${r.mediaCreated}`,
    ...r.notes,
    ...r.errors,
    ...r.warnings.slice(0, 50),
    ...(r.warnings.length > 50 ? [`…и ещё предупреждений: ${r.warnings.length - 50}`] : []),
  ].join('\n')
}

/** Удалить каталоги сессий старше суток (брошенные обмены). */
async function sweep(dir: string, now: number) {
  const entries = await readdir(dir).catch(() => [] as string[])
  for (const e of entries) {
    if (!/^[0-9a-f]{32}$/.test(e)) continue
    const s = await stat(path.join(dir, e)).catch(() => null)
    if (s && now - s.mtimeMs > 24 * 60 * 60 * 1000) await rm(path.join(dir, e), { recursive: true, force: true })
  }
}

export type ExchangeRequest = { url: string; headers: Headers; body: () => Promise<ArrayBuffer | undefined> }
export type ExchangeDeps = { payload: Payload; env?: NodeJS.ProcessEnv; now?: number; revalidate?: () => void; log?: (msg: string) => void }

export async function handleExchange(req: ExchangeRequest, deps: ExchangeDeps): Promise<Response> {
  const cfg = onecConfig(deps.env)
  const now = deps.now ?? Date.now()
  // без учётки обмен закрыт, а не открыт
  if (!cfg.user || !cfg.password) return failure('Обмен с 1С не настроен на сайте', 503)
  const q = new URL(req.url, 'http://local').searchParams
  const mode = q.get('mode')
  const type = q.get('type')

  if (mode === 'checkauth') {
    if (!checkBasic(req.headers.get('authorization'), cfg.user, cfg.password))
      return reply('failure\nНеверный логин или пароль', 401, { 'www-authenticate': 'Basic realm="1c-exchange"' })
    const { token } = issueSession(cfg.user, cfg.password, now)
    await sweep(cfg.dir, now)
    return reply(`success\n${SESSION_COOKIE}\n${token}`, 200, { 'set-cookie': `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict` })
  }

  const sid = verifySession(req.headers.get('cookie'), cfg.user, cfg.password, now)
  if (!sid) return failure('Нет сессии или она истекла — начните с mode=checkauth', 401)
  if (type !== 'catalog' && type !== 'sale') return failure(`type=${type ?? ''} не поддерживается`)
  const dir = path.join(cfg.dir, sid)

  if (mode === 'init') {
    // новый обмен — чистый каталог: повторная доставка пакета начинается с нуля, а не дописывается к старому
    await rm(dir, { recursive: true, force: true })
    await mkdir(dir, { recursive: true })
    return reply(`zip=no\nfile_limit=${cfg.fileLimit}`)
  }

  if (type === 'sale') {
    const snapFile = path.join(dir, 'sale-query.json')
    if (mode === 'query') {
      const { orders, refs, snapshot } = await loadOrdersToExport(deps.payload, SALE_LIMIT)
      // повторный query без success отдаёт те же заказы и перезаписывает снимок
      await mkdir(dir, { recursive: true })
      await writeFile(snapFile, JSON.stringify(snapshot))
      deps.log?.(`1С sale query: заказов ${orders.length}`)
      return new Response(ordersXml(orders, refs, new Date(now)), { headers: { 'content-type': 'application/xml; charset=utf-8' } })
    }
    if (mode === 'success') {
      // нет снимка (чужая/новая сессия, повторный success) — помечать нечего
      const raw = await readFile(snapFile, 'utf8').catch(() => null)
      const snapshot = raw ? (JSON.parse(raw) as ExportSnapshot) : []
      const marked = await markExported(deps.payload, snapshot, new Date(now))
      await rm(snapFile, { force: true })
      deps.log?.(`1С sale success: помечено ${marked} из ${snapshot.length}`)
      return reply('success')
    }
    // ponytail: обратная загрузка заказов из 1С (mode=file) не реализована — принимаем и не применяем, статусы идут из Б24
    if (mode === 'file') {
      deps.log?.('1С sale file: изменения заказов из 1С сайтом не применяются')
      return reply('success')
    }
    return failure(`Неизвестный mode=${mode ?? ''} для type=sale`)
  }

  if (mode === 'file') {
    const name = safeFileName(q.get('filename'))
    if (!name) return failure('Недопустимое имя файла (разрешены xml, jpg, png, webp)')
    const data = new Uint8Array((await req.body()) ?? new ArrayBuffer(0))
    if (data.byteLength > cfg.fileLimit) return failure(`Часть файла больше file_limit=${cfg.fileLimit}`)
    await mkdir(dir, { recursive: true })
    const file = path.join(dir, name)
    // ponytail: протокол без смещений — дубль части внутри сессии не отличить от следующей; такой файл
    // не пройдёт разбор при import (failure без записей), и 1С повторит обмен с init
    await appendFile(file, data)
    const max = isXml(name) ? cfg.xmlLimit : MAX_FILE_BYTES
    if ((await stat(file)).size > max) {
      await rm(file, { force: true })
      return failure(`Файл ${name} больше ${max} байт${isXml(name) ? ' (ONEC_EXCHANGE_XML_LIMIT)' : ''}`)
    }
    return reply('success')
  }

  if (mode === 'import') {
    const name = safeFileName(q.get('filename'))
    if (!name || !isXml(name)) return failure('Для import нужен filename=*.xml')
    const size = (await stat(path.join(dir, name)).catch(() => null))?.size
    if (size === undefined) return failure(`Файл ${name} не получен в этой сессии (mode=file)`)
    if (size > cfg.xmlLimit) return failure(`Файл ${name} больше ${cfg.xmlLimit} байт (ONEC_EXCHANGE_XML_LIMIT)`)
    let parsed: ReturnType<typeof parseCommerceMl>
    try {
      parsed = parseCommerceMl(await readFile(path.join(dir, name)))
    } catch (e) {
      // непредвиденный сбой разбора (в т.ч. переполнение стека) — ответ 1С, а не 500
      return failure(`${name}: пакет не применён\nОшибка разбора: ${e instanceof Error ? e.message : String(e)}`)
    }
    if (!parsed.ok) return failure(`${name}: пакет не применён\n${parsed.errors.slice(0, 50).join('\n')}`)
    let report: ImportReport
    try {
      report = await runImport(deps.payload, parsed.pkg, { dir, priceTypeId: cfg.priceTypeId })
    } catch (e) {
      // сбой до транзакции (снимок БД, загрузка картинок): товары и категории не тронуты
      deps.log?.(`1С import ${name}: ${e instanceof Error ? e.stack : e}`)
      return failure(`${name}: пакет не применён — ${e instanceof Error ? e.message : String(e)}`)
    }
    report.warnings.unshift(...parsed.warnings)
    deps.log?.(`1С import ${name}: ${report.ok ? 'success' : 'failure'}\n${summary(report)}`)
    if (!report.ok) return failure(`${name}: пакет не применён\n${summary(report)}`)
    // хуки коллекций сбрасывают кэш ещё внутри транзакции — после коммита сбрасываем ещё раз
    deps.revalidate?.()
    return reply(`success\n${summary(report)}`)
  }

  // complete — конец обмена (новые версии 1С), deactivate — снятие отсутствующих товаров: сайт ничего не снимает
  if (mode === 'complete' || mode === 'deactivate') return reply('success')
  return failure(`Неизвестный mode=${mode ?? ''}`)
}
