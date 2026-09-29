import type { TypedUser, Where } from 'payload'
import type { AdminViewServerProps } from 'payload'
import Link from 'next/link'
import type { Role } from '../access'
import { visibleGroups } from './nav-config'

// Слаги без привязки к сгенерированным типам: результат читаем как плоские документы.
type Doc = Record<string, unknown>
type LoosePayload = {
  find: (a: Record<string, unknown>) => Promise<{ totalDocs: number; docs: Doc[] }>
  count: (a: Record<string, unknown>) => Promise<{ totalDocs: number }>
}

type Row = { title: string; sub: string; href: string; dot: string }

const col = (slug: string) => `/admin/collections/${slug}`

// Все запросы — от имени пользователя с проверкой прав; недоступное скрываем, а не падаем.
async function safeFind(payload: LoosePayload, user: TypedUser, collection: string, where: Where, limit = 3) {
  try {
    const r = await payload.find({
      collection,
      where,
      user,
      overrideAccess: false,
      depth: 0,
      limit,
      pagination: true,
    })
    return { total: r.totalDocs, docs: r.docs }
  } catch {
    return null
  }
}

async function safeCount(payload: LoosePayload, user: TypedUser, collection: string) {
  try {
    const { totalDocs } = await payload.count({ collection, user, overrideAccess: false })
    return totalDocs
  } catch {
    return null
  }
}

const list = (docs: Record<string, unknown>[], key: string) =>
  docs.map((d) => String(d[key] ?? d.id)).join(', ')

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export async function Dashboard({ initPageResult }: AdminViewServerProps) {
  const { user } = initPageResult.req
  const payload = initPageResult.req.payload as unknown as LoosePayload
  if (!user) return null
  const role = user.collection === 'users' ? (user.role as Role | undefined) : undefined
  const groups = visibleGroups(role)

  const cardGroups = (
    await Promise.all(
      groups.map(async (g) => ({
        title: g.title,
        cards: (
          await Promise.all(
            g.items
              .filter((i) => i.href.startsWith('/admin/collections/'))
              .map(async (i) => ({ ...i, count: await safeCount(payload, user, i.href.split('/').pop()!) })),
          )
        ).filter((c) => c.count !== null),
      })),
    )
  ).filter((g) => g.cards.length > 0)

  const [drafts, pending, syncOrders, syncLeads, syncCustomers] = await Promise.all([
    safeFind(payload, user, 'products', { _status: { equals: 'draft' } }),
    safeFind(payload, user, 'orders', { paymentStatus: { equals: 'pending' } }),
    safeFind(payload, user, 'orders', { syncError: { exists: true } }),
    safeFind(payload, user, 'leads', { syncError: { exists: true } }),
    safeFind(payload, user, 'customers', { syncError: { exists: true } }),
  ])

  const alerts: Row[] = []
  if (drafts?.total)
    alerts.push({ title: `Моделей в черновиках: ${drafts.total}`, sub: list(drafts.docs, 'title'), href: col('products'), dot: 'var(--pay)' })
  if (pending?.total)
    alerts.push({ title: `Заказов ожидают оплаты: ${pending.total}`, sub: `№ ${list(pending.docs, 'number')}`, href: col('orders'), dot: 'var(--pay)' })
  for (const [label, slug, key, r] of [
    ['заказов', 'orders', 'number', syncOrders],
    ['заявок', 'leads', 'name', syncLeads],
    ['клиентов', 'customers', 'email', syncCustomers],
  ] as const)
    if (r?.total)
      alerts.push({ title: `Ошибка синхронизации ${label}: ${r.total}`, sub: list(r.docs, key), href: col(slug), dot: 'var(--err)' })

  const recentSrc = [
    ['products', 'Модели'],
    ['posts', 'Статьи'],
    ['pages', 'Страницы'],
  ] as const
  const recent = (
    await Promise.all(
      recentSrc.map(async ([slug, label]) => {
        try {
          const r = await payload.find({
            collection: slug,
            sort: '-updatedAt',
            limit: 5,
            depth: 0,
            user,
            overrideAccess: false,
          })
          return r.docs.map((d) => ({
            id: String(d.id),
            title: String(d.title || d.id),
            updatedAt: String(d.updatedAt),
            label,
            href: `${col(slug)}/${d.id}`,
          }))
        } catch {
          return []
        }
      }),
    )
  )
    .flat()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5)

  return (
    <div className="zp-dash">
      <div className="zp-dash__head">
        <span className="zp-caps">~/admin</span>
        <h1>Добро пожаловать, {(user.name as string | undefined) || user.email}</h1>
      </div>
      <div className="zp-dash__grid">
        <div className="zp-dash__main">
          {cardGroups.map((g) => (
            <section key={g.title} className="zp-dash__section">
              <h2 className="zp-caps">{g.title.toUpperCase()}</h2>
              <div className="zp-dash__cards">
                {g.cards.map((c) => (
                  <Link key={c.href} href={c.href} className="zp-dash__card">
                    <span className="zp-dash__card-label">{c.label}</span>
                    <strong className="zp-dash__card-count">{c.count}</strong>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="zp-dash__side">
          <section className="zp-panel">
            <h2 className="zp-panel__h">Требует внимания</h2>
            {alerts.length === 0 ? (
              <p className="zp-panel__empty">Всё в порядке</p>
            ) : (
              alerts.map((a) => (
                <Link key={a.title} href={a.href} className="zp-row">
                  <span className="zp-row__dot" style={{ background: a.dot }} />
                  <span className="zp-row__text">
                    <span>{a.title}</span>
                    <small>{a.sub}</small>
                  </span>
                  <span className="zp-row__arrow" aria-hidden="true">→</span>
                </Link>
              ))
            )}
          </section>
          <section className="zp-panel">
            <h2 className="zp-panel__h">Последние изменения</h2>
            {recent.length === 0 ? (
              <p className="zp-panel__empty">Пока нет изменений</p>
            ) : (
              recent.map((r) => (
                <Link key={`${r.label}-${r.id}`} href={r.href} className="zp-row">
                  <span className="zp-row__text">
                    <span>{r.title}</span>
                    <small>{r.label} · {fmt(r.updatedAt)}</small>
                  </span>
                </Link>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
