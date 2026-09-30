import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { showB24Retry } from './target'

describe('showB24Retry', () => {
  it('заказ и лид: только сохранённый документ без b24-id', () => {
    expect(showB24Retry('order', undefined, {})).toBe(false)
    expect(showB24Retry('order', 1, {})).toBe(true)
    expect(showB24Retry('order', 1, { b24DealId: '' })).toBe(true)
    expect(showB24Retry('order', 1, { b24DealId: '7' })).toBe(false)
    expect(showB24Retry('lead', 2, { b24LeadId: null })).toBe(true)
    expect(showB24Retry('lead', 2, { b24LeadId: '9' })).toBe(false)
  })

  it('клиент: физлицу нужен контакт, юрлицу — контакт и компания', () => {
    expect(showB24Retry('company', undefined, { kind: 'person' })).toBe(false)
    expect(showB24Retry('company', 3, { kind: 'person' })).toBe(true)
    expect(showB24Retry('company', 3, { kind: 'person', b24ContactId: '5' })).toBe(false)
    expect(showB24Retry('company', 3, { kind: 'legal', b24CompanyId: '4' })).toBe(true)
    expect(showB24Retry('company', 3, { kind: 'legal', b24ContactId: '5' })).toBe(true)
    expect(showB24Retry('company', 3, { kind: 'legal', b24CompanyId: '4', b24ContactId: '5' })).toBe(false)
  })

  it('importMap содержит кнопку', () => {
    const map = readFileSync(new URL('../../app/(payload)/admin/importMap.js', import.meta.url), 'utf8')
    expect(map).toContain('"/payload/components/B24Retry#B24Retry"')
  })
})
