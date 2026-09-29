import { describe, expect, it } from 'vitest'
import { computeTotal, formatOrderNumber, hasCustomerOrGuest, nextOrderSeq, nextStatusHistory, round2 } from './orders'

describe('round2', () => {
  it('убирает хвост float', () => expect(round2(0.1 * 3)).toBe(0.3))
})

describe('computeTotal', () => {
  it('сумма позиций + доставка, копейки округляются', () => {
    expect(computeTotal([{ price: 18.4, qty: 10000 }], 0)).toBe(184000)
    expect(computeTotal([{ price: 0.1, qty: 3 }], 0)).toBe(0.3)
    expect(computeTotal([{ price: 710, qty: 500 }, { price: 500, qty: 300 }], 1500)).toBe(506500)
  })
  it('пусто / undefined — только доставка, не NaN', () => {
    expect(computeTotal([], 0)).toBe(0)
    expect(computeTotal(undefined, undefined)).toBe(0)
    expect(computeTotal([], 250)).toBe(250)
  })
  it('мусорные значения не дают отрицательный итог и NaN', () => {
    expect(computeTotal([{ price: -5, qty: 2 }], 0)).toBe(0)
    expect(computeTotal([{ price: 10, qty: 0 }], 0)).toBe(0)
    expect(computeTotal([{ price: Number.NaN, qty: 2 }], 0)).toBe(0)
  })
})

describe('formatOrderNumber', () => {
  it('ZP-YYYY-NNNN', () => {
    expect(formatOrderNumber(2026, 418)).toBe('ZP-2026-0418')
    expect(formatOrderNumber(2026, 12345)).toBe('ZP-2026-12345')
  })
})

describe('nextStatusHistory', () => {
  const now = '2026-09-29T10:00:00.000Z'
  it('создание: первая запись', () => {
    expect(nextStatusHistory(undefined, undefined, 'accepted', now)).toEqual([{ at: now, status: 'accepted' }])
  })
  it('смена статуса дописывает запись, старые сохраняются', () => {
    const prev = [{ at: '2026-09-28T09:00:00.000Z', status: 'accepted' }]
    const out = nextStatusHistory(prev, 'accepted', 'picking', now, 'собираем')
    expect(out).toHaveLength(2)
    expect(out[1]).toEqual({ at: now, status: 'picking', note: 'собираем' })
  })
  it('тот же статус — история без изменений (повторное сохранение)', () => {
    const prev = [{ at: now, status: 'accepted' }]
    expect(nextStatusHistory(prev, 'accepted', 'accepted', now)).toEqual(prev)
  })
})

describe('hasCustomerOrGuest', () => {
  it('нужен клиент или телефон гостя', () => {
    expect(hasCustomerOrGuest({ customer: 5 })).toBe(true)
    expect(hasCustomerOrGuest({ guest: { phone: '+79001112233' } })).toBe(true)
    expect(hasCustomerOrGuest({})).toBe(false)
    expect(hasCustomerOrGuest({ guest: { name: 'Иван' } })).toBe(false)
  })
})

describe('nextOrderSeq', () => {
  it('пусто → 1', () => expect(nextOrderSeq(undefined)).toBe(1))
  it('обычный', () => expect(nextOrderSeq('ZP-2026-0418')).toBe(419))
  it('после дыры 0001,0003 → 4', () => expect(nextOrderSeq('ZP-2026-0003')).toBe(4))
  it('мусор → 1', () => {
    expect(nextOrderSeq('abc')).toBe(1)
    expect(nextOrderSeq('ZP-2026-xx')).toBe(1)
  })
})
