import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

/** Сброс кэша lib/server/catalog.ts. Теги: 'catalog' (товары, категории, отзывы), 'blog' (статьи, рубрики). */
const bust = (tag: string) => {
  try {
    revalidateTag(tag, { expire: 0 })
  } catch {
    // вне Next-запроса (seed, скрипты, тесты) кэша нет — сбрасывать нечего
  }
}

export const revalidateAfterChange =
  (tag: string): CollectionAfterChangeHook =>
  ({ doc }) => {
    bust(tag)
    return doc
  }

export const revalidateAfterDelete =
  (tag: string): CollectionAfterDeleteHook =>
  ({ doc }) => {
    bust(tag)
    return doc
  }
