import type { Lead } from '@/payload/payload-types'
import { B24_ORIGINATOR, B24_UF, b24Config, findOrAdd, lines, multi, optional } from './config'
import { registerB24Handler } from './sync'

// I-B24-LEAD: заявка с любой формы сайта → crm.lead.add с типом формы, контактами, сообщением и источником.

export const LEAD_TYPE_LABEL: Record<Lead['type'], string> = {
  feedback: 'Обратная связь',
  calculation: 'Расчёт поставки',
  samples: 'Образцы',
  consultation: 'Консультация',
  'product-request': 'Запрос по товару',
  pricelist: 'Прайс-лист',
  cart: 'Запрос из корзины',
}

const extra = (data: Lead['data']) =>
  data && typeof data === 'object' && !Array.isArray(data)
    ? Object.entries(data).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    : []

export function leadFields(lead: Lead) {
  const cfg = b24Config()
  const form = LEAD_TYPE_LABEL[lead.type]
  return {
    TITLE: `${form} — ${lead.company || lead.name || lead.phone || 'сайт'}`,
    NAME: lead.name || undefined,
    COMPANY_TITLE: lead.company || undefined,
    PHONE: multi(lead.phone),
    EMAIL: multi(lead.email),
    SOURCE_ID: cfg.sourceId,
    SOURCE_DESCRIPTION: `${B24_ORIGINATOR}, форма «${form}»${lead.sourceUrl ? `, страница ${lead.sourceUrl}` : ''}`,
    COMMENTS: lines(`Форма: ${form}`, lead.message, ...extra(lead.data)),
    ...optional('ASSIGNED_BY_ID', cfg.assignedById),
    ...optional(B24_UF.leadFormType, form),
  }
}

registerB24Handler('lead', async ({ doc, b24 }) => findOrAdd(b24, 'lead', `lead:${doc.id}`, leadFields(doc)))
