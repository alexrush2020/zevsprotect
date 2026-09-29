import type { Access, PayloadRequest } from 'payload'

export type Role = 'admin' | 'manager' | 'content'

type Actor = { collection?: string; role?: Role; id?: string | number } | null | undefined

const actor = (req: { user?: unknown }) => req.user as Actor

export const isStaff = ({ req }: { req: PayloadRequest }): boolean =>
  actor(req)?.collection === 'users'

export const isAdmin = ({ req }: { req: PayloadRequest }): boolean => {
  const u = actor(req)
  return u?.collection === 'users' && u.role === 'admin'
}

export const hasRole =
  (...roles: Role[]) =>
  ({ req }: { req: PayloadRequest }): boolean => {
    const u = actor(req)
    return u?.collection === 'users' && !!u.role && roles.includes(u.role)
  }

/** Сотрудник видит всё, остальные — только опубликованное. */
export const publishedOrStaff: Access = ({ req }) =>
  actor(req)?.collection === 'users' ? true : { _status: { equals: 'published' } }

/** Роли из списка видят всё; клиент — только документы, где `field` = его id; остальные — ничего. */
export const ownOrRoles =
  (field: string, ...roles: Role[]): Access =>
  (args) => {
    if (hasRole(...roles)({ req: args.req })) return true
    const u = actor(args.req)
    if (u?.collection === 'customers' && u.id != null) return { [field]: { equals: u.id } }
    return false
  }

/** Admin видит всех пользователей, остальные сотрудники — только себя. */
export const selfOrAdmin: Access = (args) => {
  if (isAdmin({ req: args.req })) return true
  const u = actor(args.req)
  return u?.collection === 'users' && u.id != null ? { id: { equals: u.id } } : false
}
