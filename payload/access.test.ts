import { describe, expect, it } from 'vitest'
import { hasRole, isAdmin, ownOrRoles, publishedOrStaff, selfOrAdmin } from './access'

const as = (user: unknown) => ({ req: { user } }) as never
const staff = (role: string, id = 1) => ({ collection: 'users', role, id })
const customer = (id = 7) => ({ collection: 'customers', id })

describe('access', () => {
  it('isAdmin: только admin', () => {
    expect(isAdmin(as(staff('admin')))).toBe(true)
    expect(isAdmin(as(staff('manager')))).toBe(false)
    expect(isAdmin(as(customer()))).toBe(false)
    expect(isAdmin(as(null))).toBe(false)
  })

  it('hasRole: клиент с полем role не считается сотрудником', () => {
    expect(hasRole('manager')(as({ collection: 'customers', role: 'manager' }))).toBe(false)
    expect(hasRole('manager', 'admin')(as(staff('manager')))).toBe(true)
    expect(hasRole('manager')(as(staff('content')))).toBe(false)
  })

  it('publishedOrStaff: аноним и клиент видят только опубликованное', () => {
    const where = { _status: { equals: 'published' } }
    expect(publishedOrStaff(as(null))).toEqual(where)
    expect(publishedOrStaff(as(customer()))).toEqual(where)
    expect(publishedOrStaff(as(staff('content')))).toBe(true)
  })

  it('ownOrRoles: заказы — admin/manager всё, клиент своё, content и аноним ничего', () => {
    const orders = ownOrRoles('customer', 'admin', 'manager')
    expect(orders(as(staff('manager')))).toBe(true)
    expect(orders(as(customer(7)))).toEqual({ customer: { equals: 7 } })
    expect(orders(as(staff('content')))).toBe(false)
    expect(orders(as(null))).toBe(false)
  })

  it('selfOrAdmin: остальные сотрудники читают только себя', () => {
    expect(selfOrAdmin(as(staff('admin')))).toBe(true)
    expect(selfOrAdmin(as(staff('content', 5)))).toEqual({ id: { equals: 5 } })
    expect(selfOrAdmin(as(customer()))).toBe(false)
  })
})
