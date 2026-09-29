import { describe, expect, it } from 'vitest'
import { quoteVolume, volumeUnitPrice, volumeThresholds } from './volume-quote'
import type { Product } from './types'

const p = { id: 'p-fenix', price: 100, unit: 'пара', minQty: 50, coating: 'Без покрытия', coatingType: '' } as unknown as Product

describe('объёмная цена', () => {
  it('скидки по порогам 1000/3000/5000/10000', () => {
    expect([999, 1000, 3000, 5000, 10000].map((q) => volumeUnitPrice(p, q))).toEqual([100, 95, 93, 91, 89])
  })
  it('quoteVolume: округляет qty до шага и считает итог', () => {
    const q = quoteVolume(p, 1001)
    expect(q.qty).toBe(1050)
    expect(q.discountPct).toBe(5)
    expect(q.unitPrice).toBe(95)
    expect(q.total).toBe(99750)
    expect(q.next?.qty).toBe(3000)
    expect(q.perShift).toBe(7.92)
  })
  it('минимальный заказ без скидки, потолок — 10000', () => {
    const q = quoteVolume(p, 0)
    expect(q).toMatchObject({ qty: 50, discountPct: 0, total: 5000 })
    expect(q.max).toBe(10000)
  })
  it('пороги начинаются с минимума', () => {
    expect(volumeThresholds(p).map((t) => t.qty)).toEqual([50, 1000, 3000, 5000, 10000])
  })
})
