import { describe, expect, it } from 'vitest'
import { migrateLegacyCart, migrateLegacyFavorites, normalizeCart, orderableItems, priceCart, repeatOrderItems } from './cart-pricing'
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

  it('модель без цены (price 0) — недоступна для заказа, не в сумме и не в orderable', () => {
    const free = { ...fabric, id: '3', slug: 'bez-ceny', price: 0 } as Product
    const r = priceCart(
      [
        { productId: 'bez-ceny', size: 'L', qty: 50 },
        { productId: 'tkan', size: 'L', qty: 50 },
      ],
      [...catalog, free],
    )
    expect(r.lines[0]).toMatchObject({ available: false, unitPrice: 0, total: 0 })
    expect(r.goods).toBe(5000)
    expect(orderableItems(r.lines).map((i) => i.productId)).toEqual(['tkan'])
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

describe('оформляемые позиции', () => {
  it('все недоступны → ноль позиций к заказу', () => {
    const { lines, goods } = priceCart([{ productId: 'snyat', size: 'L', qty: 100 }], catalog)
    expect(orderableItems(lines)).toEqual([])
    expect(goods).toBe(0)
  })

  it('смесь → в заказ только доступные, qty после упаковки и совпадает с суммой', () => {
    const { lines, goods } = priceCart(
      [
        { productId: 'snyat', size: 'L', qty: 100 },
        { productId: 'tkan', size: 'L', qty: 51, coating: 'Нитрил' },
      ],
      catalog,
    )
    const items = orderableItems(lines)
    expect(items).toEqual([{ productId: 'tkan', size: 'L', qty: 100, coating: 'Нитрил' }])
    expect(priceCart(items, catalog).goods).toBe(goods)
    expect(goods).toBe(10000)
  })
})

describe('normalizeCart', () => {
  it('пустой каталог (Payload недоступен) — позиции сохраняются как есть', () => {
    const raw = [
      { productId: 'tkan', size: 'L', qty: 51 },
      { productId: 'tkan', size: 'L', qty: 10 },
    ]
    expect(normalizeCart(raw, [])).toEqual([{ productId: 'tkan', size: 'L', coating: undefined, qty: 61 }])
  })

  it('по каталогу: слияние, упаковка, мусор отброшен', () => {
    expect(
      normalizeCart(
        [{ productId: 'tkan', size: 'L', qty: 30 }, { productId: 'tkan', size: 'L', qty: 30 }, { productId: 'tkan', qty: 5 }, null, { productId: 'obliv', size: 'M', qty: -1 }],
        catalog,
      ),
    ).toEqual([{ productId: 'tkan', size: 'L', coating: undefined, qty: 100 }])
    expect(normalizeCart('мусор', catalog)).toEqual([])
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

describe('repeatOrderItems: «Повторить заказ»', () => {
  const sized = { ...fabric, name: 'Ткань', sizes: ['L', 'XL'], stock: 100000 } as Product
  const obliv = { ...dipped, name: 'Облив', stock: 100000 } as Product
  const cat = [sized, obliv, { ...base, id: '3', slug: 'bez-ceny', name: 'Без цены', price: 0 } as unknown as Product]
  const quiet = { unavailable: [], priceChanges: [], qtyChanges: [], backorder: [] }

  it('ничего не изменилось — предупреждений нет; клиентский пересчёт = серверный', () => {
    const r = repeatOrderItems(
      [
        { productId: 'tkan', size: 'L', qty: 500, title: 'Ткань', price: 95 },
        { productId: 'tkan', size: 'XL', qty: 500, title: 'Ткань', price: 95 },
        { productId: 'obliv', size: 'L', qty: 24, title: 'Облив', price: 28.9 },
      ],
      cat,
    )
    expect(r).toEqual({
      ...quiet,
      items: [
        { productId: 'tkan', size: 'L', qty: 500 },
        { productId: 'tkan', size: 'XL', qty: 500 },
        { productId: 'obliv', size: 'L', qty: 24 },
      ],
    })
    const priced = priceCart(r.items, cat)
    expect(priced.goods).toBe(95000 + 693.6)
    // повторная нормализация в корзине (addToCart/snapOrderQty) не меняет состав и сумму
    expect(priceCart(normalizeCart(r.items, cat), cat).goods).toBe(priced.goods)
  })

  it('изменённая цена: было из снапшота, стало — как посчитает корзина', () => {
    const r = repeatOrderItems([{ productId: 'obliv', size: 'L', qty: 24, title: 'Облив', price: 27.46 }], cat)
    expect(r.priceChanges).toEqual([{ title: 'Облив', was: 27.46, now: 28.9 }])
    expect(priceCart(r.items, cat).lines[0].unitPrice).toBe(28.9)
  })

  it('частичный набор: снятый размер выпадает, скидка по объёму — от оставшегося состава', () => {
    const r = repeatOrderItems(
      [
        { productId: 'tkan', size: 'L', qty: 500, title: 'Ткань', price: 95 },
        { productId: 'tkan', size: 'XXL', qty: 500, title: 'Ткань', price: 95 },
      ],
      cat,
    )
    expect(r.items).toEqual([{ productId: 'tkan', size: 'L', qty: 500 }])
    expect(r.unavailable).toEqual(['Ткань · XXL'])
    // 500 пар — уже без скидки 1000+: цена в отчёте совпадает с корзиной
    expect(r.priceChanges).toEqual([{ title: 'Ткань', was: 95, now: 100 }])
    expect(priceCart(r.items, cat).lines[0].unitPrice).toBe(100)
  })

  it('снятая с публикации модель, модель без цены, снятое покрытие, удалённый товар — недоступны по названию', () => {
    const r = repeatOrderItems(
      [
        { productId: 'tkan', size: 'L', qty: 50, title: 'Ткань', price: 100 },
        { productId: 'tkan', size: 'XL', qty: 50, coating: 'ПВХ', title: 'Ткань', price: 100 },
        { productId: 'snyata', size: 'L', qty: 50, title: 'Снятая', price: 10 },
        { productId: 'bez-ceny', size: 'L', qty: 50 },
        { productId: '', size: 'M', qty: 50, title: 'Удалённая' },
      ],
      cat,
    )
    expect(r.items).toEqual([{ productId: 'tkan', size: 'L', qty: 50 }])
    expect(r.unavailable).toEqual(['Ткань · XL · ПВХ', 'Снятая · L', 'Без цены · L', 'Удалённая · M'])
    expect(r.priceChanges).toEqual([])
  })

  it('qty округляется вверх до кратности упаковки текущего каталога', () => {
    const r = repeatOrderItems([{ productId: 'obliv', size: 'L', qty: 200, title: 'Облив', price: 28.9 }], cat)
    expect(r.items).toEqual([{ productId: 'obliv', size: 'L', qty: 204 }])
    expect(r.qtyChanges).toEqual([{ title: 'Облив · L', was: 200, now: 204 }])
  })

  it('остаток меньше суммарного qty или 0 — позиция остаётся (под заказ) и помечается', () => {
    const low = [{ ...sized, stock: 600 } as Product, { ...obliv, stock: 0 } as Product]
    const r = repeatOrderItems(
      [
        { productId: 'tkan', size: 'L', qty: 500 },
        { productId: 'tkan', size: 'XL', qty: 500 },
        { productId: 'obliv', size: 'L', qty: 12 },
      ],
      low,
    )
    expect(r.items).toHaveLength(3)
    expect(r.backorder).toEqual(['Ткань', 'Облив'])
    expect(repeatOrderItems([{ productId: 'tkan', size: 'L', qty: 500 }], low).backorder).toEqual([])
  })

  it('демо-заказ без цен в снапшоте — сравнения цен нет', () => {
    expect(repeatOrderItems([{ productId: 'obliv', size: 'L', qty: 24 }], cat).priceChanges).toEqual([])
  })

  it('всё недоступно — пустой состав, корзину не трогаем', () => {
    expect(repeatOrderItems([{ productId: 'snyata', size: 'L', qty: 50, title: 'Снятая' }], cat)).toEqual({
      ...quiet,
      items: [],
      unavailable: ['Снятая · L'],
    })
  })
})
