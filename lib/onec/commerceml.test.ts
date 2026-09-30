import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCommerceMl, parseNumber } from './commerceml'
import { parseXml, XmlError } from './xml'

const fx = (name: string) => readFileSync(path.join(__dirname, '__fixtures__', name))

describe('parseXml', () => {
  it('сущности, числовые ссылки, CDATA, самозакрытые теги', () => {
    const r = parseXml('<?xml version="1.0"?><a x="1 &amp; 2"><b>&#1060;&#x438;&lt;</b><c/><d><![CDATA[<сырой>]]></d></a>')
    expect(r.attrs.x).toBe('1 & 2')
    expect(r.children.map((c) => c.name)).toEqual(['b', 'c', 'd'])
    expect(r.children[0].text).toBe('Фи<')
    expect(r.children[2].text).toBe('<сырой>')
  })
  it('несовпадающие теги, DOCTYPE, неизвестная сущность — ошибка', () => {
    expect(() => parseXml('<a><b></a>')).toThrow(XmlError)
    expect(() => parseXml('<!DOCTYPE x [<!ENTITY e "boom">]><a>&e;</a>')).toThrow(XmlError)
    expect(() => parseXml('<a>&e;</a>')).toThrow(XmlError)
    expect(() => parseXml('<a></a><b/>')).toThrow(XmlError)
  })
})

describe('parseNumber', () => {
  it('точка, запятая, пробелы; мусор → NaN', () => {
    expect(parseNumber('45.50')).toBe(45.5)
    expect(parseNumber('1 234,5')).toBe(1234.5)
    expect(parseNumber('12р')).toBeNaN()
  })
})

describe('parseCommerceMl: import.xml', () => {
  const r = parseCommerceMl(fx('import.xml'))
  if (!r.ok) throw new Error(r.errors.join('\n'))
  const cat = r.pkg.catalog!

  it('группы с вложенностью', () => {
    expect(cat.groups).toEqual([
      { id: 'grp-gloves', title: 'Перчатки', parentId: undefined },
      { id: 'grp-nitril', title: 'Нитриловые', parentId: 'grp-gloves' },
      { id: 'grp-knit', title: 'Трикотажные', parentId: 'grp-gloves' },
    ])
    expect(cat.onlyChanges).toBe(false)
  })
  it('товар: кириллица, &amp;, описание, картинка, свойства из справочника', () => {
    const fen = cat.products[0]
    expect(fen).toMatchObject({ id: 'a1b2c3d4-0000-0000-0000-00000000fe01', sku: 'ZP-FEN-01', title: 'Перчатки «Феникс» нитриловые & облив', groupIds: ['grp-nitril'] })
    expect(fen.description).toBe('Нитриловое покрытие по ладони.\n\nДля работы с маслами и нефтепродуктами.')
    expect(fen.images).toEqual(['import_files/a1/a1b2c3d4-0000-0000-0000-00000000fe01_1.jpg'])
    expect(fen.props).toContainEqual({ name: 'Основа', value: 'Полиэстер' })
    expect(fen.props).toContainEqual({ name: 'Плотность, г/м²', value: '45' })
    expect(fen.requisites).toContainEqual({ name: 'ВидНоменклатуры', value: 'Товар' })
    expect(cat.products[1].description).toBe('Хлопковая основа <10 класс>.')
    expect(cat.products).toHaveLength(3)
  })
})

describe('parseCommerceMl: offers.xml', () => {
  const r = parseCommerceMl(fx('offers.xml'))
  if (!r.ok) throw new Error(r.errors.join('\n'))
  const { priceTypes, offers } = r.pkg.offers!
  it('типы цен и НДС', () => {
    expect(priceTypes.map((t) => t.id)).toEqual(['pt-rozn', 'pt-opt'])
    expect(priceTypes[1]).toMatchObject({ title: 'Оптовая', currency: 'RUB', vatIncluded: true })
  })
  it('две цены, остаток по складам, предложение без цены', () => {
    expect(offers[0].prices.map((p) => [p.typeId, p.value])).toEqual([['pt-rozn', 60], ['pt-opt', 45.5]])
    expect(offers[0]).toMatchObject({ quantity: 1200, unit: 'пар' })
    expect(offers[1].quantity).toBe(280)
    expect(offers[2].prices).toEqual([])
    expect(offers[2].quantity).toBe(5)
  })
})

describe('parseCommerceMl: невалидные пакеты', () => {
  it('оборванный файл — ошибка, без структуры', () => {
    const r = parseCommerceMl(fx('broken.xml'))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0]).toMatch(/XML не разобран/)
  })
  it('чужой корень, товар без Ид, цена не число', () => {
    expect(parseCommerceMl(Buffer.from('<Root/>')).ok).toBe(false)
    const noId = parseCommerceMl(Buffer.from('<КоммерческаяИнформация><Каталог><Товары><Товар><Наименование>x</Наименование></Товар></Товары></Каталог></КоммерческаяИнформация>'))
    expect(noId.ok).toBe(false)
    const badPrice = parseCommerceMl(
      Buffer.from('<КоммерческаяИнформация><ПакетПредложений><Предложения><Предложение><Ид>g</Ид><Цены><Цена><ЦенаЗаЕдиницу>дорого</ЦенаЗаЕдиницу></Цена></Цены></Предложение></Предложения></ПакетПредложений></КоммерческаяИнформация>'),
    )
    expect(badPrice.ok).toBe(false)
  })
  it('невалидный UTF-8 — ошибка, а не «кракозябры» в каталоге', () => {
    expect(parseCommerceMl(Buffer.from([0x3c, 0x61, 0x3e, 0xff, 0xfe, 0x3c, 0x2f, 0x61, 0x3e])).ok).toBe(false)
  })
  it('вложенность групп глубже 20 — ошибка пакета, без переполнения стека', () => {
    let groups = '<Группа><Ид>g-last</Ид><Наименование>x</Наименование></Группа>'
    for (let i = 0; i < 25; i++) groups = `<Группа><Ид>g${i}</Ид><Наименование>x</Наименование><Группы>${groups}</Группы></Группа>`
    const r = parseCommerceMl(Buffer.from(`<КоммерческаяИнформация><Классификатор><Группы>${groups}</Группы></Классификатор></КоммерческаяИнформация>`))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join()).toMatch(/глубже 20/)
  })
})
