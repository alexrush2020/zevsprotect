import { expect, it } from 'vitest'
import { kindFromMime } from './media'

it('kindFromMime', () => {
  expect(kindFromMime('image/jpeg')).toBe('image')
  expect(kindFromMime('application/pdf')).toBe('doc')
  expect(kindFromMime(undefined)).toBe('doc')
})
