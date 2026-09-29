'use client'
import { useDocumentInfo, useDocumentTitle, useTranslation } from '@payloadcms/ui'
import { useEffect } from 'react'

// Заголовок документа: у нового вместо «[Без названия]» — «Новая модель» и т.п.;
// prefix дописывается к сохранённому («Заказ № ZP-2026-0001»).
// Payload пересчитывает заголовок эффектом провайдера при каждом изменении данных — в том же батче,
// что и наш эффект (провайдер — родитель, его эффект идёт позже), поэтому ставим заголовок следующим тиком.
export function DocTitle({ newTitle, prefix }: { newTitle: string; prefix?: string }) {
  const { id } = useDocumentInfo()
  const { title, setDocumentTitle } = useDocumentTitle()
  const { t } = useTranslation()
  useEffect(() => {
    const next =
      !id && title === `[${t('general:untitled')}]`
        ? newTitle
        : id && prefix && title && !title.startsWith(prefix)
          ? `${prefix}${title}`
          : null
    if (!next) return
    const timer = setTimeout(() => setDocumentTitle(next))
    return () => clearTimeout(timer)
  }, [id, title, t, newTitle, prefix, setDocumentTitle])
  return null
}
