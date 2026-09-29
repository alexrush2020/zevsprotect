import { describe, expect, it } from 'vitest'
import { NAV_GROUPS, visibleGroups } from './nav-config'

const labels = (role?: 'admin' | 'manager' | 'content') =>
  visibleGroups(role).flatMap((g) => g.items.map((i) => i.label))

describe('visibleGroups', () => {
  it('admin видит всё', () => {
    expect(visibleGroups('admin')).toHaveLength(NAV_GROUPS.length)
    expect(labels('admin')).toContain('Пользователи')
  })
  it('content: нет заказов, клиентов, заявок, пользователей', () => {
    const l = labels('content')
    for (const hidden of ['Заказы', 'Клиенты', 'Заявки', 'Пользователи']) expect(l).not.toContain(hidden)
    expect(l).toContain('Модели')
    expect(l).toContain('Статьи')
  })
  it('manager: заказы есть, правки каталога — нет (пункты каталога только для чтения видны)', () => {
    expect(labels('manager')).toContain('Заказы')
    expect(labels('manager')).not.toContain('Пользователи')
  })
  it('без роли (неизвестный пользователь) — пусто, без исключения', () => {
    expect(visibleGroups(undefined)).toEqual([])
  })
  it('пустые группы не возвращаются', () => {
    expect(visibleGroups('content').every((g) => g.items.length > 0)).toBe(true)
  })
})
