import { describe, expect, it } from 'vitest'
import { migrateLegacyCart, migrateLegacyFavorites, priceCart } from './cart-pricing'
import { LEGACY_PRODUCT_IDS } from './legacy-product-ids'
import { products } from './data/catalog'
import type { Product } from './types'

const base = { id: '1', unit: 'пара', minQty: 50, coating: 'Без покрытия', coatingType: '', stock: 100 }
const fabric = { ...base, slug: 'tkan', price: 100 } as unknown as Product
const dipped = { ...base, id: '2', slug: 'obliv', price: 28.9, minQty: 12, coating: 'Нитрил' } as unknown as Product
const catalog = [fabric, dipped]

describe('priceCart', () => {
  it('минимум и кратность: ручной ввод округляется вверх, мусор/0 — строка выпадает', () => {
    const { lines } = priceCart(
      [
        { productId: 'tkan', size: 'L', qty: 1 },
        { productId: 'tkan', size: 'XL', qty: 51 },
        { productId: 'obliv', size: 'L', qty: 13 },
        { productId: 'obliv', size: 'M', qty: 0 },
      ],
      catalog,
    )
    expect(lines.map((l) => l.qty)).toEqual([50, 100, 24])
  })

  it('скидка по суммарному qty товара на границах 999/1000, НДС внутри суммы', () => {
    const below = priceCart([{ productId: 'tkan', size: 'L', qty: 950 }], catalog)
    expect(below.goods).toBe(95000)
    const at = priceCart(
      [
        { productId: 'tkan', size: 'L', qty: 500 },
        { productId: 'tkan', size: 'XL', qty: 500 },
      ],
      catalog,
    )
    expect(at.lines.map((l) => [l.unitPrice, l.total])).toEqual([[95, 47500], [95, 47500]])
    expect(at).toMatchObject({ goods: 95000, net: 79166.67, vat: 15833.33 })
    expect(priceCart([{ productId: 'tkan', size: 'L', qty: 10000 }], catalog).lines[0].unitPrice).toBe(89)
  })

  it('копейки: round(цена × qty) по товару, как cartGoodsTotal прототипа', () => {
    const r = priceCart([{ productId: 'obliv', size: 'L', qty: 1000 }], catalog)
    // 28.9 × 0.95 = 27.455 → 27.46; 27.46 × 1008
    expect(r.lines[0]).toMatchObject({ qty: 1008, unitPrice: 27.46, total: 27679.68 })
    expect(r.goods).toBe(27679.68)
  })

  it('товара нет в каталоге — недоступен, не в сумме, не падает', () => {
    const r = priceCart(
      [
        { productId: 'snyat', size: 'L', qty: 100 },
        { productId: 'tkan', size: 'L', qty: 50 },
      ],
      catalog,
    )
    expect(r.lines[0]).toMatchObject({ available: false, product: null, total: 0 })
    expect(r.goods).toBe(5000)
  })
})

describe('миграция localStorage прототипа', () => {
  it('p-… → slug, неизвестные отброшены, остальное сохранено', () => {
    expect(
      migrateLegacyCart([
        { productId: 'p-atlant', size: 'L', qty: 50, coating: 'Нитрил' },
        { productId: 'p-net-takogo', size: 'L', qty: 50 },
        null,
        { productId: 'p-fenix', size: 'XL', qty: 12 },
      ]),
    ).toEqual([
      { productId: 'atlant', size: 'L', qty: 50, coating: 'Нитрил' },
      { productId: 'feniks', size: 'XL', qty: 12 },
    ])
    expect(migrateLegacyCart('мусор')).toEqual([])
    expect(migrateLegacyFavorites(['p-shield', 'p-x', 7, 'toString'])).toEqual([LEGACY_PRODUCT_IDS['p-shield']])
  })

  it('таблица покрывает весь мок-каталог', () => {
    expect(Object.fromEntries(products.map((p) => [p.id, p.slug]))).toEqual(LEGACY_PRODUCT_IDS)
  })
})
