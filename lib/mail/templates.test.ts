import { describe, expect, it } from 'vitest'
import { leadMail, orderMail, registrationMail, resetPasswordMail } from './templates'

describe('письма', () => {
  it('заказ: номер, позиции, итог', () => {
    const m = orderMail({ number: 'ZP-2026-0001', items: [{ title: 'Феникс', qty: 50, price: 100 }], total: 5000 })
    expect(m.subject).toContain('ZP-2026-0001')
    expect(m.text).toContain('Феникс — 50 ×')
    expect(m.text).toMatch(/Итого: 5\s000 ₽/)
  })
  it('заявка и регистрация', () => {
    expect(leadMail({ name: 'Иван', phone: '+7 900' }).text).toContain('+7 900')
    expect(registrationMail({ name: 'Иван' }).text).toContain('Иван')
  })
  it('сброс пароля: ссылка; html экранируется', () => {
    const m = resetPasswordMail({ resetUrl: 'https://x.ru/r?t=1&a="b"' })
    expect(m.text).toContain('https://x.ru/r?t=1&a="b"')
    expect(m.html).toContain('t=1&amp;a=&quot;b&quot;')
    expect(leadMail({ name: '<b>' }).html).not.toContain('<b>')
  })
})
