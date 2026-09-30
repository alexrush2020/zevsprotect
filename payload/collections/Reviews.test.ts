import { describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.hoisted(() => vi.fn())
vi.mock('next/cache', () => ({ revalidateTag }))

import { Reviews } from './Reviews'

const as = (user: unknown) => ({ req: { user } }) as never
const customer = (id = 7) => ({ collection: 'customers', id })
const staff = (role: string) => ({ collection: 'users', role, id: 1 })
const anon = null
const op = (name: 'create' | 'read' | 'update' | 'delete') => Reviews.access![name] as (a: never) => unknown
const field = (name: string) =>
  Reviews.fields.find((x) => 'name' in x && x.name === name) as { access: Record<string, (a: never) => boolean> }

describe('Reviews access', () => {
  it('read: аноним, клиент и content видят только одобренные; admin/manager — все', () => {
    for (const u of [anon, customer(), staff('content')]) expect(op('read')(as(u))).toEqual({ approved: { equals: true } })
    for (const r of ['admin', 'manager']) expect(op('read')(as(staff(r)))).toBe(true)
  })

  it('create/update/delete через REST: только admin/manager; витрина — через server action', () => {
    for (const name of ['create', 'update', 'delete'] as const) {
      for (const u of [anon, customer(), staff('content'), { collection: 'customers', role: 'admin', id: 7 }])
        expect(op(name)(as(u))).toBe(false)
      for (const r of ['admin', 'manager']) expect(op(name)(as(staff(r)))).toBe(true)
    }
  })

  it('approved: выставляют только admin/manager', () => {
    const f = field('approved')
    for (const o of ['create', 'update']) {
      for (const u of [anon, customer(), staff('content')]) expect(f.access[o](as(u))).toBe(false)
      expect(f.access[o](as(staff('manager')))).toBe(true)
    }
  })

  it('customer (связь с клиентом) не отдаётся анониму/клиенту', () => {
    const f = field('customer')
    for (const u of [anon, customer(), staff('content')]) expect(f.access.read(as(u))).toBe(false)
    expect(f.access.read(as(staff('admin')))).toBe(true)
  })

  it('кэш catalog сбрасывается, только если отзыв одобрен сейчас или был одобрен', () => {
    const req = { payload: { logger: { warn: vi.fn() } } }
    const change = (doc: object, previousDoc?: object) => {
      revalidateTag.mockClear()
      for (const hook of Reviews.hooks!.afterChange!) (hook as (a: never) => unknown)({ doc, previousDoc, req } as never)
      return revalidateTag.mock.calls.length
    }
    const remove = (doc: object) => {
      revalidateTag.mockClear()
      for (const hook of Reviews.hooks!.afterDelete!) (hook as (a: never) => unknown)({ doc, req } as never)
      return revalidateTag.mock.calls.length
    }
    expect(change({ approved: false })).toBe(0) // новый неодобренный с витрины
    expect(change({ approved: false }, { approved: false })).toBe(0) // правка неодобренного
    expect(change({ approved: true }, { approved: false })).toBe(1) // одобрение
    expect(revalidateTag).toHaveBeenCalledWith('catalog', { expire: 0 })
    expect(change({ approved: false }, { approved: true })).toBe(1) // снятие одобрения
    expect(change({ approved: true }, { approved: true })).toBe(1) // правка одобренного
    expect(remove({ approved: true })).toBe(1)
    expect(remove({ approved: false })).toBe(0)
  })
})
