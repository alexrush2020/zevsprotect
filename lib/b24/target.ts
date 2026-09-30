// Чистая часть ядра Б24 без серверных зависимостей: её импортирует и клиентский компонент админки (B24Retry).

export const B24_TARGET = {
  order: { collection: 'orders', field: 'b24DealId' },
  lead: { collection: 'leads', field: 'b24LeadId' },
  company: { collection: 'customers', field: 'b24CompanyId' },
} as const

export type B24Kind = keyof typeof B24_TARGET

export const isB24Kind = (v: unknown): v is B24Kind => typeof v === 'string' && Object.hasOwn(B24_TARGET, v)

/**
 * b24-id документа, если отправка завершена, иначе undefined. Клиент готов, когда есть контакт
 * (у юрлица — ещё и компания): компания без контакта значит, что прошлая попытка упала посередине.
 */
export function syncedId(kind: B24Kind, doc: object): string | undefined {
  const get = (f: string) => {
    const v: unknown = Reflect.get(doc, f)
    return typeof v === 'string' && v ? v : undefined
  }
  if (kind !== 'company') return get(B24_TARGET[kind].field)
  const contact = get('b24ContactId')
  if (!contact) return undefined
  if (Reflect.get(doc, 'kind') === 'legal') return get('b24CompanyId')
  return get('b24CompanyId') ?? contact
}

/** Кнопка «Отправить в Б24 повторно»: только у сохранённого документа, отправка которого не завершена. */
export const showB24Retry = (kind: B24Kind, id: unknown, doc: object): boolean => Boolean(id) && !syncedId(kind, doc)
