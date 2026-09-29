import { describe, expect, it } from 'vitest'
import { Customers } from './Customers'
import { Orders } from './Orders'

const as = (user: unknown) => ({ req: { user } }) as never
const customer = (id = 7) => ({ collection: 'customers', id })
const staff = (role: string) => ({ collection: 'users', role, id: 1 })

describe('Customers/Orders access', () => {
  it('клиент читает и правит только свой профиль', () => {
    for (const op of ['read', 'update'] as const) {
      const f = Customers.access![op] as (a: never) => unknown
      expect(f(as(customer(7)))).toEqual({ id: { equals: 7 } })
      expect(f(as(null))).toBe(false)
      expect(f(as(staff('content')))).toBe(false)
      expect(f(as(staff('manager')))).toBe(true)
    }
  })

  it('consentPdAt: клиент не может задать через API, только admin', () => {
    const f = Customers.fields.find((x) => 'name' in x && x.name === 'consentPdAt') as { access: Record<string, (a: never) => boolean> }
    for (const op of ['create', 'update']) {
      expect(f.access[op](as(null))).toBe(false)
      expect(f.access[op](as(customer()))).toBe(false)
      expect(f.access[op](as(staff('admin')))).toBe(true)
    }
  })

  it('клиент не удаляет профили; регистрация открыта', () => {
    expect((Customers.access!.delete as (a: never) => boolean)(as(customer()))).toBe(false)
    expect((Customers.access!.create as () => boolean)()).toBe(true)
    expect((Customers.access!.admin as () => boolean)()).toBe(false)
  })

  it('клиент видит только свои заказы, аноним — никаких', () => {
    const read = Orders.access!.read as (a: never) => unknown
    expect(read(as(customer(7)))).toEqual({ customer: { equals: 7 } })
    expect(read(as(null))).toBe(false)
    expect(read(as(staff('manager')))).toBe(true)
  })

  it('клиент не создаёт, не правит и не удаляет заказы', () => {
    for (const op of ['create', 'update', 'delete'] as const) {
      expect((Orders.access![op] as (a: never) => boolean)(as(customer()))).toBe(false)
    }
  })
})
