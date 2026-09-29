export const validateInn =
  (kind?: 'person' | 'legal') =>
  (v: string | null | undefined): true | string => {
    if (!v) return true
    const len = kind === 'legal' ? [10] : kind === 'person' ? [12] : [10, 12]
    return /^\d+$/.test(v) && len.includes(v.length)
      ? true
      : `ИНН — ${len.join(' или ')} цифр без пробелов`
  }

export const validateKnitClass = (v: string | null | undefined): true | string => {
  if (!v) return true
  return /^\d+$/.test(v) && +v >= 5 && +v <= 18 ? true : 'Класс вязки — целое число от 5 до 18'
}
