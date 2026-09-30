export type Mail = { subject: string; text: string; html: string }

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const rub = (n: number) => `${n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`

function build(subject: string, lines: string[], link?: { url: string; label: string }): Mail {
  const text = [...lines, ...(link ? [`${link.label}: ${link.url}`] : []), '', 'зевспротект®'].join('\n')
  const html =
    lines.map((l) => `<p>${esc(l)}</p>`).join('') +
    (link ? `<p><a href="${esc(link.url)}">${esc(link.label)}</a></p>` : '') +
    '<p>зевспротект®</p>'
  return { subject, text, html }
}

export type OrderMailItem = { title: string; qty: number; price: number }

export function orderMail(o: { number: string; items: OrderMailItem[]; total: number }): Mail {
  return build(`Заказ ${o.number} принят`, [
    `Ваш заказ ${o.number} принят.`,
    ...o.items.map((i) => `${i.title} — ${i.qty} × ${rub(i.price)}`),
    `Итого: ${rub(o.total)}`,
  ])
}

export function leadMail(l: { name: string; phone?: string; message?: string }): Mail {
  return build('Заявка получена', [
    `${l.name}, мы получили вашу заявку и скоро свяжемся с вами.`,
    ...(l.phone ? [`Телефон: ${l.phone}`] : []),
    ...(l.message ? [`Сообщение: ${l.message}`] : []),
  ])
}

/** Уведомление менеджеру о новой заявке с формы витрины. */
export function leadManagerMail(l: {
  type: string
  name?: string | null
  phone?: string | null
  email?: string | null
  company?: string | null
  message?: string | null
  data?: unknown
  sourceUrl?: string | null
}): Mail {
  const extra = l.data && typeof l.data === 'object' ? Object.entries(l.data as Record<string, unknown>) : []
  return build(`Новая заявка с сайта: ${l.type}`, [
    `Тип формы: ${l.type}`,
    `Имя: ${l.name ?? ''}`,
    ...(l.phone ? [`Телефон: ${l.phone}`] : []),
    ...(l.email ? [`Email: ${l.email}`] : []),
    ...(l.company ? [`Организация: ${l.company}`] : []),
    ...(l.message ? [`Сообщение: ${l.message}`] : []),
    ...extra.map(([k, v]) => `${k}: ${String(v)}`),
    ...(l.sourceUrl ? [`Страница: ${l.sourceUrl}`] : []),
  ])
}

export function registrationMail(u: { name: string }): Mail {
  return build('Добро пожаловать в зевспротект', [`${u.name}, регистрация прошла успешно.`])
}

export function resetPasswordMail(u: { resetUrl: string }): Mail {
  return build(
    'Сброс пароля',
    ['Вы запросили сброс пароля. Если это были не вы, просто проигнорируйте письмо.'],
    { url: u.resetUrl, label: 'Задать новый пароль' },
  )
}
