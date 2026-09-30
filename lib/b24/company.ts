import type { Payload } from 'payload'
import type { Customer } from '@/payload/payload-types'
import type { B24Client } from './client'
import { B24_ORIGINATOR, b24Config, findOrAdd, lines, multi, optional } from './config'
import { registerB24Handler } from './sync'

// I-B24-COMP: клиент сайта → компания (юрлицо) + контакт, привязанный к компании; физлицо — только контакт.
// Промежуточные ID пишутся в клиента сразу, повтор без сохранённого ID находит сущность по ORIGIN_ID.

const B24_COMPANY_ENTITY_TYPE = 4 // crm.requisite: ENTITY_TYPE_ID компании

// ponytail: блокировка в пределах процесса (jobs autoRun в одном процессе); при нескольких воркерах — advisory lock БД
const locks = new Map<string, Promise<unknown>>()
function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const run = (locks.get(key) ?? Promise.resolve()).catch(() => undefined).then(fn)
  locks.set(key, run)
  return run.finally(() => {
    if (locks.get(key) === run) locks.delete(key)
  })
}

async function saveCustomer(payload: Payload, id: number, data: Partial<Pick<Customer, 'b24CompanyId' | 'b24ContactId' | 'syncError'>>) {
  await payload.update({ collection: 'customers', id, data, depth: 0, overrideAccess: true })
}

function requisitesText(c: Customer) {
  return lines(
    c.inn && `ИНН: ${c.inn}`,
    c.kpp && `КПП: ${c.kpp}`,
    c.address && `Юр. адрес: ${c.address}`,
    c.bankName && `Банк: ${c.bankName}`,
    c.bik && `БИК: ${c.bik}`,
    c.bankAccount && `Р/с: ${c.bankAccount}`,
  )
}

/** Реквизиты по шаблону портала (только при B24_REQUISITE_PRESET_ID); повтор — по наличию реквизита у компании. */
async function ensureRequisite(b24: B24Client, companyId: string, c: Customer, presetId: string) {
  const existing = await b24.call<{ ID: string }[]>('crm.requisite.list', {
    filter: { ENTITY_TYPE_ID: B24_COMPANY_ENTITY_TYPE, ENTITY_ID: companyId },
    select: ['ID'],
  })
  const rqId =
    existing[0]?.ID ??
    String(
      await b24.call('crm.requisite.add', {
        fields: {
          ENTITY_TYPE_ID: B24_COMPANY_ENTITY_TYPE,
          ENTITY_ID: companyId,
          PRESET_ID: presetId,
          NAME: c.company || c.name,
          ...optional('RQ_COMPANY_NAME', c.company),
          ...optional('RQ_INN', c.inn),
          ...optional('RQ_KPP', c.kpp),
        },
      }),
    )
  if (!c.bankAccount && !c.bik) return
  const banks = await b24.call<{ ID: string }[]>('crm.requisite.bankdetail.list', { filter: { ENTITY_ID: rqId }, select: ['ID'] })
  if (banks.length) return
  await b24.call('crm.requisite.bankdetail.add', {
    fields: {
      ENTITY_ID: rqId,
      NAME: c.bankName || 'Основной счёт',
      ...optional('RQ_BANK_NAME', c.bankName),
      ...optional('RQ_BIK', c.bik),
      ...optional('RQ_ACC_NUM', c.bankAccount),
    },
  })
}

export type B24CustomerIds = { companyId?: string; contactId: string; /** для текста сделки */ title: string }

/**
 * Клиент → Б24 в порядке компания → реквизиты → контакт (с COMPANY_ID). Общий для регистрации и заказа.
 * Читает клиента заново под блокировкой: параллельные job регистрации и заказа не создают дублей.
 */
export function syncCustomerToB24(args: { customerId: number; b24: B24Client; payload: Payload }): Promise<B24CustomerIds> {
  const { customerId, b24, payload } = args
  return withLock(`customer:${customerId}`, async () => {
    const c = (await payload.findByID({ collection: 'customers', id: customerId, depth: 0, overrideAccess: true })) as Customer
    const cfg = b24Config()
    const assigned = optional('ASSIGNED_BY_ID', cfg.assignedById)
    const origin = `customer:${c.id}`
    let companyId = c.b24CompanyId || undefined

    if (c.kind === 'legal' && !companyId) {
      companyId = await findOrAdd(b24, 'company', origin, {
        TITLE: c.company || c.name,
        COMPANY_TYPE: 'CUSTOMER',
        PHONE: multi(c.phone),
        EMAIL: multi(c.email),
        SOURCE_ID: cfg.sourceId,
        SOURCE_DESCRIPTION: `Регистрация на ${B24_ORIGINATOR}`,
        COMMENTS: requisitesText(c),
        ...assigned,
      })
      await saveCustomer(payload, c.id, { b24CompanyId: companyId })
    }
    // до контакта: пока контакта нет, прошлая попытка могла упасть на реквизитах — ensureRequisite повторяем (он идемпотентен)
    if (c.kind === 'legal' && companyId && !c.b24ContactId && cfg.requisitePresetId)
      await ensureRequisite(b24, companyId, c, cfg.requisitePresetId)

    let contactId = c.b24ContactId || undefined
    if (!contactId) {
      contactId = await findOrAdd(b24, 'contact', origin, {
        NAME: c.name,
        PHONE: multi(c.phone),
        EMAIL: multi(c.email),
        TYPE_ID: 'CLIENT',
        SOURCE_ID: cfg.sourceId,
        SOURCE_DESCRIPTION: `Регистрация на ${B24_ORIGINATOR}`,
        ...optional('COMPANY_ID', companyId),
        ...optional('POST', c.kind === 'legal' ? 'Контактное лицо' : undefined),
        ...assigned,
      })
      await saveCustomer(payload, c.id, { b24ContactId: contactId, syncError: null })
    } else if (c.syncError) {
      await saveCustomer(payload, c.id, { syncError: null })
    }
    return { companyId, contactId, title: [c.company, c.name, c.inn && `ИНН ${c.inn}`, c.phone, c.email].filter(Boolean).join(', ') }
  })
}

// Для физлица компании нет: ID контакта сохранён самим syncCustomerToB24, b24CompanyId остаётся пустым (статус job — skipped).
registerB24Handler('company', async ({ doc, b24, payload }) => (await syncCustomerToB24({ customerId: doc.id, b24, payload })).companyId ?? null)
