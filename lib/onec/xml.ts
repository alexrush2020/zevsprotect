// Минимальный XML-парсер для CommerceML: элементы, атрибуты, текст, CDATA, комментарии, стандартные сущности.
// Собственный, а не sax/fast-xml-parser: в package.json XML-парсера нет (sax — лишь транзитивная зависимость payload,
// без типов), а CommerceML — простое подмножество XML без пространств имён, DTD и смешанного содержимого.
// ponytail: весь документ в памяти — пакеты каталога на сотни товаров; для десятков МБ нужен потоковый разбор.

export type XmlNode = { name: string; attrs: Record<string, string>; children: XmlNode[]; text: string }

export class XmlError extends Error {}

const ENT: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }

function decodeEntities(s: string, at: number): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);|&/g, (m, e: string | undefined) => {
    if (!e) throw new XmlError(`Одиночный «&» около позиции ${at}`)
    if (e[0] === '#') {
      const code = e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      if (!Number.isFinite(code) || code > 0x10ffff) throw new XmlError(`Неверная ссылка ${m}`)
      return String.fromCodePoint(code)
    }
    if (!(e in ENT)) throw new XmlError(`Неизвестная сущность ${m}`)
    return ENT[e]
  })
}

/** Байты → строка: BOM или encoding из XML-декларации (1С пишет UTF-8, старые выгрузки — windows-1251). */
export function decodeXml(buf: Uint8Array): string {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return new TextDecoder('utf-8', { fatal: true }).decode(buf.subarray(3))
  const head = new TextDecoder('latin1').decode(buf.subarray(0, 200))
  const enc = /^<\?xml[^>]*encoding=["']([\w-]+)["']/i.exec(head)?.[1]?.toLowerCase() ?? 'utf-8'
  try {
    return new TextDecoder(enc, { fatal: true }).decode(buf)
  } catch (e) {
    throw new XmlError(`Не удалось декодировать файл как ${enc}: ${e instanceof Error ? e.message : e}`)
  }
}

const NAME = /^[^\s/>=<"'!?]+/

export function parseXml(src: string): XmlNode {
  let i = 0
  const stack: XmlNode[] = []
  let root: XmlNode | undefined
  const fail = (msg: string): never => {
    throw new XmlError(`${msg} (позиция ${i})`)
  }
  const top = () => stack[stack.length - 1]
  const addText = (t: string) => {
    if (!stack.length) {
      if (t.trim()) fail('Текст вне корневого элемента')
      return
    }
    top().text += t
  }
  while (i < src.length) {
    const lt = src.indexOf('<', i)
    if (lt < 0) {
      addText(decodeEntities(src.slice(i), i))
      break
    }
    if (lt > i) addText(decodeEntities(src.slice(i, lt), i))
    i = lt
    if (src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i + 4)
      if (end < 0) fail('Незакрытый комментарий')
      i = end + 3
    } else if (src.startsWith('<![CDATA[', i)) {
      const end = src.indexOf(']]>', i + 9)
      if (end < 0) fail('Незакрытый CDATA')
      addText(src.slice(i + 9, end))
      i = end + 3
    } else if (src.startsWith('<?', i)) {
      const end = src.indexOf('?>', i + 2)
      if (end < 0) fail('Незакрытая инструкция обработки')
      i = end + 2
    } else if (src.startsWith('<!', i)) {
      fail('DOCTYPE/DTD не поддерживается')
    } else if (src[i + 1] === '/') {
      const end = src.indexOf('>', i)
      if (end < 0) fail('Незакрытый тег')
      const name = src.slice(i + 2, end).trim()
      const open = stack.pop()
      if (!open || open.name !== name) fail(`Закрывающий </${name}> не соответствует <${open?.name ?? ''}>`)
      i = end + 1
    } else {
      i++
      const name = NAME.exec(src.slice(i, i + 200))?.[0] ?? fail('Пустое имя тега')
      i += name.length
      const node: XmlNode = { name, attrs: {}, children: [], text: '' }
      for (;;) {
        while (/\s/.test(src[i] ?? '')) i++
        if (i >= src.length) fail(`Незакрытый тег <${name}>`)
        if (src[i] === '>' || src.startsWith('/>', i)) break
        const an = NAME.exec(src.slice(i, i + 200))?.[0] ?? fail(`Неверный атрибут в <${name}>`)
        i += an.length
        while (/\s/.test(src[i] ?? '')) i++
        if (src[i] !== '=') fail(`Атрибут ${an} без значения`)
        i++
        while (/\s/.test(src[i] ?? '')) i++
        const q = src[i]
        if (q !== '"' && q !== "'") fail(`Значение атрибута ${an} без кавычек`)
        const end = src.indexOf(q, i + 1)
        if (end < 0) fail(`Незакрытое значение атрибута ${an}`)
        node.attrs[an] = decodeEntities(src.slice(i + 1, end), i)
        i = end + 1
      }
      const selfClose = src[i] === '/'
      i += selfClose ? 2 : 1
      if (stack.length) top().children.push(node)
      else if (root) fail('Второй корневой элемент')
      else root = node
      if (!selfClose) stack.push(node)
    }
  }
  if (stack.length) throw new XmlError(`Файл оборван: не закрыт <${top().name}>`)
  if (!root) throw new XmlError('Нет корневого элемента')
  return root
}

export const child = (n: XmlNode | undefined, name: string) => n?.children.find((c) => c.name === name)
export const kids = (n: XmlNode | undefined, name: string) => n?.children.filter((c) => c.name === name) ?? []
/** Текст дочернего элемента, обрезанный; пустой → undefined. */
export const text = (n: XmlNode | undefined, name?: string) => {
  const t = (name ? child(n, name) : n)?.text.trim()
  return t ? t : undefined
}
