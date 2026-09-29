import { describe, expect, it } from 'vitest'
import { splitVat } from './vat'

describe('splitVat', () => {
  it('выделяет НДС 20% из брутто', () => {
    expect(splitVat(120)).toEqual({ net: 100, vat: 20, gross: 120 })
  })
  it('net + vat = gross с округлением до копеек', () => {
    const r = splitVat(99.99)
    expect(r.net).toBe(83.33)
    expect(Math.round((r.net + r.vat) * 100) / 100).toBe(99.99)
  })
  it('другая ставка и ноль', () => {
    expect(splitVat(110, 0.1)).toEqual({ net: 100, vat: 10, gross: 110 })
    expect(splitVat(0)).toEqual({ net: 0, vat: 0, gross: 0 })
  })
})
