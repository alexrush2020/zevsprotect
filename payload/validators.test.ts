import { describe, expect, it } from 'vitest'
import { validateInn, validateKnitClass } from './validators'

describe('validateInn', () => {
  it('пусто — допустимо (поле необязательное)', () => {
    expect(validateInn('legal')('')).toBe(true)
    expect(validateInn('legal')(undefined)).toBe(true)
  })
  it('legal — 10 цифр, person — 12', () => {
    expect(validateInn('legal')('6154123456')).toBe(true)
    expect(typeof validateInn('legal')('615412345678')).toBe('string')
    expect(validateInn('person')('615412345678')).toBe(true)
    expect(typeof validateInn('person')('6154123456')).toBe('string')
  })
  it('буквы и пробелы отклоняются', () => {
    expect(typeof validateInn('legal')('61541234 6')).toBe('string')
    expect(typeof validateInn('legal')('abcdefghij')).toBe('string')
  })
  it('без kind — 10 или 12 цифр', () => {
    expect(validateInn()('6154123456')).toBe(true)
    expect(validateInn()('615412345678')).toBe(true)
    expect(typeof validateInn()('12345')).toBe('string')
  })
})

describe('validateKnitClass', () => {
  it('число 5–18', () => {
    for (const v of ['5', '13', '18']) expect(validateKnitClass(v)).toBe(true)
    for (const v of ['4', '19', 'abc', '7.5']) expect(typeof validateKnitClass(v)).toBe('string')
  })
  it('пусто допустимо', () => expect(validateKnitClass('')).toBe(true))
})
