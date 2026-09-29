export const kindFromMime = (mime?: string | null): 'image' | 'doc' =>
  mime?.startsWith('image/') ? 'image' : 'doc'
