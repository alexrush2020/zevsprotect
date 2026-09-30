import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { checkBasic, handleExchange, issueSession, safeFileName, SESSION_COOKIE, verifySession } from './exchange'
import { fakePayload } from './fake-payload.test-util'

const basic = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`

function setup(extraEnv: Record<string, string> = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'onec-ex-'))
  const env = { ONEC_EXCHANGE_USER: 'site1c', ONEC_EXCHANGE_PASSWORD: 'пароль-1', ONEC_EXCHANGE_DIR: dir, ...extraEnv } as unknown as NodeJS.ProcessEnv
  const f = fakePayload({ categories: [], products: [] })
  const revalidate = vi.fn()
  let cookie = ''
  const call = async (query: string, init: { auth?: string; body?: Uint8Array | string; cookie?: string } = {}) => {
    const headers = new Headers()
    if (init.auth) headers.set('authorization', init.auth)
    const c = init.cookie ?? cookie
    if (c) headers.set('cookie', c)
    const body = typeof init.body === 'string' ? new TextEncoder().encode(init.body) : init.body
    const res = await handleExchange(
      { url: `http://site/api/1c-exchange?${query}`, headers, body: async () => (body ? new Uint8Array(body).buffer : undefined) },
      { payload: f.payload, env, revalidate },
    )
    return { status: res.status, text: await res.text() }
  }
  const login = async () => {
    const r = await call('type=catalog&mode=checkauth', { auth: basic('site1c', 'пароль-1') })
    const [, name, value] = r.text.split('\n')
    cookie = `${name}=${value}`
    return r
  }
  return { dir, f, call, login, revalidate }
}

const fixture = (name: string) => readFileSync(path.join(__dirname, '__fixtures__', name))

describe('checkauth и сессия', () => {
  it('без учётки в env обмен закрыт (503), а не открыт', async () => {
    const res = await handleExchange(
      { url: 'http://site/api/1c-exchange?type=catalog&mode=checkauth', headers: new Headers({ authorization: basic('', '') }), body: async () => undefined },
      { payload: fakePayload().payload, env: {} as unknown as NodeJS.ProcessEnv },
    )
    expect(res.status).toBe(503)
    expect(await res.text()).toMatch(/^failure/)
  })
  it('неверный пароль — 401 failure; верный — success, имя cookie, значение', async () => {
    const s = setup()
    expect((await s.call('type=catalog&mode=checkauth', { auth: basic('site1c', 'x') })).status).toBe(401)
    expect((await s.call('type=catalog&mode=checkauth')).status).toBe(401)
    const r = await s.login()
    const lines = r.text.split('\n')
    expect(lines[0]).toBe('success')
    expect(lines[1]).toBe(SESSION_COOKIE)
    expect(lines).toHaveLength(3)
  })
  it('checkBasic: пароль с двоеточием, мусор в заголовке', () => {
    expect(checkBasic(basic('u', 'a:b'), 'u', 'a:b')).toBe(true)
    expect(checkBasic('Bearer x', 'u', 'p')).toBe(false)
    expect(checkBasic('Basic !!!', 'u', 'p')).toBe(false)
  })
  it('подделанная, чужая или истёкшая сессия не проходит', () => {
    const { token } = issueSession('u', 'p', 1000)
    const c = `${SESSION_COOKIE}=${token}`
    expect(verifySession(c, 'u', 'p', 2000)).toMatch(/^[0-9a-f]{32}$/)
    expect(verifySession(c, 'u', 'другой', 2000)).toBeNull()
    expect(verifySession(c.replace(/.$/, (ch) => (ch === '0' ? '1' : '0')), 'u', 'p', 2000)).toBeNull()
    expect(verifySession(c, 'u', 'p', 1000 + 13 * 3600_000)).toBeNull()
  })
  it('режимы без сессии — failure', async () => {
    const s = setup()
    const r = await s.call('type=catalog&mode=init')
    expect(r.status).toBe(401)
    expect(r.text).toMatch(/^failure/)
  })
})

describe('safeFileName', () => {
  it('только basename и разрешённые расширения', () => {
    expect(safeFileName('import_files/a1/pic.jpg')).toBe('pic.jpg')
    expect(safeFileName('..\\..\\etc\\offers.xml')).toBe('offers.xml')
    expect(safeFileName('../../etc/passwd')).toBeNull()
    expect(safeFileName('..')).toBeNull()
    expect(safeFileName('.env')).toBeNull()
    expect(safeFileName('run.sh')).toBeNull()
    expect(safeFileName('a\u0000.xml')).toBeNull()
    expect(safeFileName(null)).toBeNull()
  })
})

describe('init → file → import', () => {
  it('init: zip=no и file_limit из env', async () => {
    const s = setup({ ONEC_EXCHANGE_FILE_LIMIT: '1000' })
    await s.login()
    expect((await s.call('type=catalog&mode=init')).text).toBe('zip=no\nfile_limit=1000')
  })

  it('файл по частям, path traversal не выходит из каталога сессии, полный цикл импорта', async () => {
    const s = setup({ ONEC_PRICE_TYPE_ID: 'pt-opt' })
    await s.login()
    await s.call('type=catalog&mode=init')
    const xml = fixture('import.xml')
    const half = Math.floor(xml.length / 2)
    expect((await s.call('type=catalog&mode=file&filename=import.xml', { body: xml.subarray(0, half) })).text).toBe('success')
    expect((await s.call('type=catalog&mode=file&filename=import.xml', { body: xml.subarray(half) })).text).toBe('success')
    expect((await s.call('type=catalog&mode=file&filename=offers.xml', { body: fixture('offers.xml') })).text).toBe('success')
    expect((await s.call(`type=catalog&mode=file&filename=${encodeURIComponent('../../evil.xml')}`, { body: 'x' })).text).toBe('success')
    expect(existsSync(path.join(s.dir, '..', 'evil.xml'))).toBe(false)
    expect((await s.call('type=catalog&mode=file&filename=evil.php', { body: 'x' })).text).toMatch(/^failure/)

    const imp = await s.call('type=catalog&mode=import&filename=import.xml')
    expect(imp.text).toMatch(/^success\nтовары: создано 3/)
    const off = await s.call('type=catalog&mode=import&filename=offers.xml')
    expect(off.text).toMatch(/^success\nтовары: создано 0, обновлено 3/)
    expect(s.revalidate).toHaveBeenCalledTimes(2)
    expect(s.f.db.products.find((p) => p.sku === 'ZP-FEN-01')!.price).toBe(45.5)

    // повторный import того же файла — без изменений
    expect((await s.call('type=catalog&mode=import&filename=offers.xml')).text).toMatch(/обновлено 0, без изменений 3/)
  })

  it('часть больше file_limit — failure', async () => {
    const s = setup({ ONEC_EXCHANGE_FILE_LIMIT: '10' })
    await s.login()
    await s.call('type=catalog&mode=init')
    expect((await s.call('type=catalog&mode=file&filename=import.xml', { body: 'x'.repeat(11) })).text).toMatch(/^failure/)
  })

  it('битый пакет: failure с описанием, никаких записей и сброса кэша', async () => {
    const s = setup()
    await s.login()
    await s.call('type=catalog&mode=init')
    await s.call('type=catalog&mode=file&filename=import.xml', { body: fixture('broken.xml') })
    const r = await s.call('type=catalog&mode=import&filename=import.xml')
    expect(r.text).toMatch(/^failure\nimport\.xml: пакет не применён\nXML не разобран/)
    expect(s.f.writes).toEqual([])
    expect(s.revalidate).not.toHaveBeenCalled()
  })

  it('повторный init начинает пакет заново (части не дописываются к старому файлу)', async () => {
    const s = setup()
    await s.login()
    await s.call('type=catalog&mode=init')
    await s.call('type=catalog&mode=file&filename=import.xml', { body: fixture('import.xml') })
    await s.call('type=catalog&mode=init')
    await s.call('type=catalog&mode=file&filename=import.xml', { body: fixture('import.xml') })
    expect((await s.call('type=catalog&mode=import&filename=import.xml')).text).toMatch(/^success/)
  })

  it('import без файла, type=sale, неизвестный mode — failure', async () => {
    const s = setup()
    await s.login()
    await s.call('type=catalog&mode=init')
    expect((await s.call('type=catalog&mode=import&filename=offers.xml')).text).toMatch(/^failure/)
    expect((await s.call('type=sale&mode=query')).text).toMatch(/^failure/)
    expect((await s.call('type=catalog&mode=zzz')).text).toMatch(/^failure/)
    expect((await s.call('type=catalog&mode=complete')).text).toBe('success')
  })
})
