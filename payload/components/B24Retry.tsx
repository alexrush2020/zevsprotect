'use client'
import { Button, useConfig, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useState } from 'react'

const MESSAGES: Record<string, string> = {
  queued: 'Поставлено в очередь — отправка в течение минуты.',
  already: 'Уже в Б24, повтор не нужен.',
  failed: 'Не удалось поставить в очередь, попробуйте позже.',
  not_found: 'Документ не найден.',
}

// «Отправить в Б24 повторно» — для сохранённого документа без b24-id. Сервер повторно проверяет роль и b24-id.
export function B24Retry({ kind, idField }: { kind: 'order' | 'lead' | 'company'; idField: string }) {
  const { id } = useDocumentInfo()
  const b24Id = useFormFields(([fields]) => fields[idField]?.value)
  const { config } = useConfig()
  const [state, setState] = useState<{ busy: boolean; message?: string }>({ busy: false })
  if (!id || b24Id) return null

  async function retry() {
    setState({ busy: true })
    try {
      const res = await fetch(`${config.serverURL}${config.routes.api}/b24/retry`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id }),
      })
      const data = (await res.json().catch(() => ({}))) as { status?: string; message?: string }
      setState({ busy: false, message: (data.status && MESSAGES[data.status]) || data.message || `Ошибка ${res.status}` })
    } catch {
      setState({ busy: false, message: 'Нет связи с сервером.' })
    }
  }

  return (
    <div className="field-type">
      <Button buttonStyle="secondary" size="small" disabled={state.busy} onClick={retry}>
        Отправить в Б24 повторно
      </Button>
      {state.message && <p className="field-description">{state.message}</p>}
    </div>
  )
}
