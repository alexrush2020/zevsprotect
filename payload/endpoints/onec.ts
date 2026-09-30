import { revalidateTag } from 'next/cache'
import type { Endpoint, PayloadHandler } from 'payload'
import { handleExchange } from '@/lib/onec/exchange'

/** /api/1c-exchange — узел 1С «Обмен с сайтом» (CommerceML). Логика и протокол — lib/onec/exchange.ts. */
const handler: PayloadHandler = (req) =>
  handleExchange(
    { url: req.url ?? '', headers: req.headers, body: async () => req.arrayBuffer?.() },
    {
      payload: req.payload,
      revalidate: () => revalidateTag('catalog', { expire: 0 }),
      log: (msg) => req.payload.logger.info(msg),
    },
  )

// 1С шлёт checkauth/init/import GET-ом, file — POST-ом; разные версии платформы бывают и POST на всё
export const onecExchangeEndpoints: Endpoint[] = [
  { path: '/1c-exchange', method: 'get', handler },
  { path: '/1c-exchange', method: 'post', handler },
]
