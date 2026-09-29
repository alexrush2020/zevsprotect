import { describe, expect, it } from 'vitest'
import { productMinQty, productOrderStep, snapOrderQty, formatPairs } from './order-qty'

const fabric = { unit: 'пара', minQty: 50, coating: 'Без покрытия', coatingType: '' }
const dipped = { unit: 'пара', minQty: 12, coating: 'Нитрил', coatingType: '' }
const pcs = { unit: 'шт', minQty: 10, coating: '', coatingType: '' }

describe('кратность упаковки', () => {
  it('шаг: 50 пар трикотаж, 12 облив, minQty для штучных', () => {
    expect(productOrderStep(fabric)).toBe(50)
    expect(productOrderStep(dipped)).toBe(12)
    expect(productOrderStep({ ...fabric, coatingType: 'Облив' })).toBe(12)
    expect(productOrderStep(pcs)).toBe(10)
  })
  it('минимум не меньше шага', () => {
    expect(productMinQty({ ...fabric, minQty: 1 })).toBe(50)
    expect(productMinQty({ ...dipped, minQty: 100 })).toBe(100)
  })
  it('ручной ввод округляется вверх до шага, не ниже минимума', () => {
    expect(snapOrderQty(51, fabric)).toBe(100)
    expect(snapOrderQty(13, dipped)).toBe(24)
    expect(snapOrderQty(1, dipped)).toBe(12)
  })
  it('мусор → минимум; allowZero → 0', () => {
    expect(snapOrderQty(NaN, fabric)).toBe(50)
    expect(snapOrderQty(-5, fabric)).toBe(50)
    expect(snapOrderQty(0, fabric, { allowZero: true })).toBe(0)
  })
  it('склонение пар', () => {
    expect([1, 2, 5, 11, 21].map(formatPairs)).toEqual(['1 пара', '2 пары', '5 пар', '11 пар', '21 пара'])
  })
})
