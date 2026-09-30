import { describe, expect, it } from "vitest";
import type { Article, Product } from "@/lib/types";
import type { About, Home, Setting } from "@/payload/payload-types";
import {
  ABOUT_DEFAULTS,
  CONTACTS_DEFAULTS,
  DELIVERY_DEFAULTS,
  HOME_DEFAULTS,
  PRIVACY_DEFAULTS,
  mapAbout,
  mapContacts,
  mapDelivery,
  mapHome,
  mapPageParagraphs,
  pickHomeArticles,
  pickHomeProducts,
} from "./content";

const lex = (...paras: string[]) => ({
  root: { type: "root", children: paras.map((t) => ({ type: "paragraph", children: [{ type: "text", text: t }] })) },
});

describe("дефолты = текущая витрина", () => {
  it("пустой/недоступный глобал -> тексты по умолчанию", () => {
    expect(mapHome(null)).toEqual(HOME_DEFAULTS);
    expect(mapHome({ heroTitle: "  ", advantages: [], reviews: [] })).toEqual(HOME_DEFAULTS);
    expect(mapAbout(undefined)).toEqual(ABOUT_DEFAULTS);
    expect(mapDelivery({})).toEqual(DELIVERY_DEFAULTS);
    expect(mapContacts({ contacts: { phone: null, email: null } } as Partial<Setting>)).toEqual(CONTACTS_DEFAULTS);
    expect(mapPageParagraphs(undefined, PRIVACY_DEFAULTS)).toEqual(PRIVACY_DEFAULTS);
  });

  it("Learned: доска отзывов без «Проходная»/«Арсеналтрейдинг», слот «Прибой», без 2005", () => {
    const all = JSON.stringify([HOME_DEFAULTS, ABOUT_DEFAULTS]);
    expect(all).not.toMatch(/Проходная|Арсеналтрейдинг|2005|Протокол испытаний/);
    expect(HOME_DEFAULTS.reviews.map((r) => r.company)).toContain("ООО «Прибой»");
    expect(ABOUT_DEFAULTS.documents[0].title).toMatch(/Декларация/);
  });
});

describe("mapHome", () => {
  it("строки заголовка, цифры, отзывы и выбор редактора", () => {
    const doc = {
      heroTitle: "Сила\n\n в руках ",
      stats: [{ value: 90, suffix: "+", label: "регионов", id: "a" }, { value: 5, suffix: null, label: "лет", id: "b" }],
      terms: [{ text: "Один пункт" }],
      reviews: [{ company: "ООО «Прибой»", city: null, line: null, text: "Хорошо", fact: null }],
      stamps: [{ label: "Прибой" }],
      featuredProducts: [{ slug: "feniks" }, 42], // 42 — неопубликованный товар (без доступа приходит id)
      featuredPosts: [],
    } as unknown as Partial<Home>;
    const c = mapHome(doc);
    expect(c.heroTitle).toEqual(["Сила", "в руках"]);
    expect(c.stats).toEqual([{ to: 90, suffix: "+", label: "регионов" }, { to: 5, label: "лет" }]);
    expect(c.terms).toEqual(["Один пункт"]);
    expect(c.reviews).toEqual([{ company: "ООО «Прибой»", city: "", line: "", text: "Хорошо", fact: "" }]);
    expect(c.stamps).toEqual([{ label: "Прибой", redacted: false }]);
    expect(c.featuredProducts).toEqual(["feniks"]);
    expect(c.aboutTitle).toBe(HOME_DEFAULTS.aboutTitle);
  });
});

describe("mapAbout", () => {
  it("абзацы текста, цифры, документы только с файлом", () => {
    const doc = {
      text: lex("Лид", "Примечание 1", "Примечание 2"),
      capacity: 70000,
      regions: 0,
      geo: [{ title: "ЮФО", detail: "1–2 дня" }],
      documents: [
        { title: "Декларация", file: { url: "/api/media/file/d.pdf" } },
        { title: "Без файла", file: 5 },
      ],
    } as unknown as Partial<About>;
    const c = mapAbout(doc);
    expect([c.lead, c.note]).toEqual(["Лид", "Примечание 1 Примечание 2"]);
    expect(c.capacity).toBe(70000);
    expect(c.regions).toBe(ABOUT_DEFAULTS.regions);
    expect(c.geo).toEqual([["ЮФО", "1–2 дня"]]);
    expect(c.documents).toEqual([{ title: "Декларация", href: "/api/media/file/d.pdf" }]);
  });
});

describe("mapContacts", () => {
  it("телефон -> tel:, MAX только https, отделы", () => {
    const c = mapContacts({
      contacts: {
        phone: "8 (863) 000-11-22",
        max: "javascript:alert(1)",
        desks: [{ title: "Склад", phone: null, email: "s@x.ru" }],
      },
    } as unknown as Partial<Setting>);
    expect(c.phoneHref).toBe("tel:88630001122");
    expect(c.maxHref).toBe(CONTACTS_DEFAULTS.maxHref);
    expect(c.desks).toEqual([{ title: "Склад", email: "s@x.ru" }]);
    expect(mapContacts({ contacts: { max: "https://max.ru/x" } } as Partial<Setting>).maxHref).toBe("https://max.ru/x");
  });
});

describe("подбор для главной", () => {
  const p = (slug: string, featured?: boolean) => ({ slug, featured }) as Product;
  const a = (slug: string, home?: boolean) => ({ slug, home }) as Article;
  it("товары: выбор редактора в его порядке, иначе бейдж (до 8)", () => {
    const list = [p("a", true), p("b"), p("c", true)];
    expect(pickHomeProducts(list, []).map((x) => x.slug)).toEqual(["a", "c"]);
    expect(pickHomeProducts(list, ["c", "zz", "b"]).map((x) => x.slug)).toEqual(["c", "b"]);
  });
  it("статьи: флаг home, иначе выбор редактора (до 3)", () => {
    const list = [a("x", false), a("y", true), a("z", true)];
    expect(pickHomeArticles(list, []).map((x) => x.slug)).toEqual(["y", "z"]);
    expect(pickHomeArticles(list, ["x"]).map((x) => x.slug)).toEqual(["x"]);
  });
});
