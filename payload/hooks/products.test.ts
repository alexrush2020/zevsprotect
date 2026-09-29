import { describe, expect, it } from 'vitest'
import { isPriceLocked, isPriceLockedFor, protectFromImport } from './products'

const original = {
  manualOverride: true,
  title: 'Феникс (правка админа)',
  description: 'ручной текст',
  price: 710,
  stock: 420,
  gallery: [{ image: 1 }],
  guid1c: 'g-1',
  note: 'не защищено',
}

describe('protectFromImport', () => {
  it('импорт + manualOverride: защищённые поля остаются прежними', () => {
    const out = protectFromImport({ title: 'Из 1С', price: 1, stock: 2 }, original, { fromImport: true })
    expect(out.title).toBe('Феникс (правка админа)')
    expect(out.price).toBe(710)
    expect(out.stock).toBe(420)
  })
  it('поля, которых нет в данных импорта, тоже не теряются', () => {
    const out = protectFromImport({ guid1c: 'g-1' }, original, { fromImport: true })
    expect(out.description).toBe('ручной текст')
    expect(out.gallery).toEqual([{ image: 1 }])
  })
  it('не-защищённые поля импорт обновляет', () => {
    const out = protectFromImport({ note: 'новое' }, original, { fromImport: true })
    expect(out.note).toBe('новое')
  })
  it('без manualOverride импорт пишет всё', () => {
    const out = protectFromImport({ title: 'Из 1С' }, { ...original, manualOverride: false }, { fromImport: true })
    expect(out.title).toBe('Из 1С')
  })
  it('правка из админки (нет fromImport) ничего не блокирует', () => {
    const out = protectFromImport({ title: 'Новое имя' }, original, {})
    expect(out.title).toBe('Новое имя')
  })
  it('создание (нет originalDoc) — данные как есть', () => {
    expect(protectFromImport({ title: 'A' }, undefined, { fromImport: true })).toEqual({ title: 'A' })
  })
})

describe('isPriceLocked', () => {
  it('заблокировано только для товара из 1С без ручной правки', () => {
    expect(isPriceLocked({ guid1c: 'g', manualOverride: false })).toBe(true)
    expect(isPriceLocked({ guid1c: 'g', manualOverride: true })).toBe(false)
    expect(isPriceLocked({ manualOverride: false })).toBe(false)
    expect(isPriceLocked(undefined)).toBe(false)
  })
})

describe('isPriceLockedFor', () => {
  const doc = { guid1c: 'g', manualOverride: false }
  it('PATCH только price при guid1c и manualOverride=false — заблокировано', () => {
    expect(isPriceLockedFor({ doc, data: { price: 1 } as never })).toBe(true)
  })
  it('manualOverride=true в doc — разрешено', () => {
    expect(isPriceLockedFor({ doc: { ...doc, manualOverride: true }, data: {} })).toBe(false)
  })
  it('manualOverride=true в data — разрешено', () => {
    expect(isPriceLockedFor({ doc, data: { manualOverride: true } })).toBe(false)
  })
  it('создание без doc — разрешено', () => {
    expect(isPriceLockedFor({ data: { guid1c: 'g' } })).toBe(false)
  })
})
