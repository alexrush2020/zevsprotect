import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

/** Сброс кэша lib/server/catalog.ts. Теги: 'catalog' (товары, категории, отзывы), 'blog' (статьи, рубрики). */
const bust = (tag: string, logger?: { warn: (msg: string) => void }) => {
  try {
    revalidateTag(tag, { expire: 0 })
  } catch (e) {
    // вне Next-запроса (seed, скрипты, jobs) сбросить нельзя — кэш подстрахован TTL в lib/server/catalog.ts
    logger?.warn(`revalidateTag(${tag}) не выполнен: ${e instanceof Error ? e.message : e}`)
  }
}

export const revalidateAfterChange =
  (tag: string): CollectionAfterChangeHook =>
  ({ doc, req }) => {
    bust(tag, req.payload.logger)
    return doc
  }

export const revalidateAfterDelete =
  (tag: string): CollectionAfterDeleteHook =>
  ({ doc, req }) => {
    bust(tag, req.payload.logger)
    return doc
  }
