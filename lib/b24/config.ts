import type { B24Client } from './client'

// Настройки CRM-полей Б24 и общие помощники исполнителей (deal/lead/company).
//
// TODO(заказчик): ID воронки, стадий, ответственного и пользовательских полей знает только портал заказчика —
// не выдумываем. Пока значение не задано, поле в Б24 не передаётся (Б24 возьмёт свои значения по умолчанию).
// Вопросы заказчику:
//  1. B24_DEAL_CATEGORY_ID — в какую воронку класть сделки с сайта (ID направления)?
//  2. B24_DEAL_STAGE_ID — стартовая стадия сделки (например C1:NEW)? Связано с BIZ-5 (маппинг стадий → статусы).
//  3. B24_ASSIGNED_BY_ID — ответственный по умолчанию (ID пользователя) для сделок, лидов, компаний, контактов?
//  4. B24_SOURCE_ID — источник «Веб-сайт» на портале (по умолчанию стандартный WEB)?
//  5. B24_REQUISITE_PRESET_ID — ID шаблона реквизитов «Организация» (без него ИНН/КПП/банк идут в комментарий компании).
//  6. Нужны ли пользовательские поля (UF_CRM_*) — тип формы у лида, способ оплаты/доставки у сделки? Их коды — в B24_UF.
//  7. BIZ-7: создавать ли сделку для гостевого заказа (B24_GUEST_DEALS=1) — сейчас по умолчанию нет.
//  8. Цены в заказе с НДС? Сейчас строки сделки уходят без ставки налога — как PRICE из заказа.

export const B24_ORIGINATOR = 'zevsprotect.ru'

/** Коды пользовательских полей портала (UF_CRM_…). Пусто — поле не отправляется. */
export const B24_UF: Partial<Record<'leadFormType' | 'dealPaymentMethod' | 'dealDelivery' | 'dealOrderNumber', string>> = {}

const opt = (v: string | undefined) => v?.trim() || undefined

/** Читается при каждом вызове: env меняется без перезапуска тестов/процесса. */
export function b24Config(env: NodeJS.ProcessEnv = process.env) {
  return {
    guestDeals: env.B24_GUEST_DEALS === '1',
    dealCategoryId: opt(env.B24_DEAL_CATEGORY_ID),
    dealStageId: opt(env.B24_DEAL_STAGE_ID),
    assignedById: opt(env.B24_ASSIGNED_BY_ID),
    sourceId: opt(env.B24_SOURCE_ID) ?? 'WEB', // стандартный источник Б24 «Веб-сайт»
    requisitePresetId: opt(env.B24_REQUISITE_PRESET_ID),
  }
}

/** Поле только при заданном значении — чтобы не слать пустые/выдуманные ID. */
export const optional = (key: string | undefined, value: unknown): Record<string, unknown> =>
  key && value !== undefined && value !== null && value !== '' ? { [key]: value } : {}

/** Мультиполе PHONE/EMAIL. */
export const multi = (value: string | null | undefined) => (value ? [{ VALUE: value, VALUE_TYPE: 'WORK' }] : undefined)

export const lines = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join('\n')

type Entity = 'deal' | 'lead' | 'company' | 'contact'

/**
 * Идемпотентное создание: ищем сущность по ORIGINATOR_ID+ORIGIN_ID (её могла создать прошлая попытка, ID которой
 * не успел сохраниться), иначе add. Совпадение проверяем сами: портал, проигнорировавший фильтр, не должен дать чужой ID.
 */
export async function findOrAdd(b24: B24Client, entity: Entity, originId: string, fields: Record<string, unknown>): Promise<string> {
  const found = await b24.call<{ ID: string | number; ORIGIN_ID?: string; ORIGINATOR_ID?: string }[]>(`crm.${entity}.list`, {
    filter: { ORIGINATOR_ID: B24_ORIGINATOR, ORIGIN_ID: originId },
    select: ['ID', 'ORIGIN_ID', 'ORIGINATOR_ID'],
  })
  const hit = (Array.isArray(found) ? found : []).find((r) => r.ORIGINATOR_ID === B24_ORIGINATOR && String(r.ORIGIN_ID) === originId)
  if (hit) return String(hit.ID)
  const id = await b24.call<number | string>(`crm.${entity}.add`, { fields: { ...fields, ORIGINATOR_ID: B24_ORIGINATOR, ORIGIN_ID: originId } })
  return String(id)
}
