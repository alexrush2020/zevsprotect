import { brand } from "@/lib/brand";
import { DEFAULT_DOCS, passageStamps, reviews } from "@/lib/data/catalog";
import { lexicalToParagraphs } from "@/lib/server/map";
import type { Article, PassagePlate, PassageStamp, Product } from "@/lib/types";
import type { About, Delivery, Home, Page, Setting } from "@/payload/payload-types";

/**
 * Контент витрины из глобалов Payload (home, about, delivery, settings) и страниц (pages) — чистый
 * маппинг без обращения к БД. Пустое поле или пустой массив -> текст по умолчанию (сегодняшний текст
 * прототипа), поэтому незаполненная админка и сбой чтения дают текущий вид, а не пустую страницу.
 * Дефолты массивов также служат defaultValue глобалов (payload/globals/*), чтобы редактор видел текущие тексты.
 */

export type HomeStat = { to: number; suffix?: string; label: string };
export type TitledText = { title: string; text: string };
export type DocLink = { title: string; href: string };
export type ContactDesk = { title: string; phone?: string; phoneHref?: string; email: string };

export type HomeContent = {
  heroTitle: string[];
  heroText: string;
  stats: HomeStat[];
  aboutTitle: string;
  aboutText: string;
  advantages: TitledText[];
  terms: string[];
  reviewsTitle: string;
  reviews: PassagePlate[];
  stamps: PassageStamp[];
  ctaTitle: string;
  ctaText: string;
  /** Выбор редактора (slug); пусто — товары с бейджем «На главной» / статьи с флагом home. */
  featuredProducts: string[];
  featuredPosts: string[];
};

export type AboutContent = {
  lead: string;
  note: string;
  capacity: number;
  whyLead: TitledText[];
  modelsCount: number;
  regions: number;
  geo: [string, string][];
  documents: DocLink[];
};

export type DeliveryContent = { intro: string[]; terms: TitledText[] };

export type SiteContacts = {
  phone: string;
  phoneHref: string;
  email: string;
  address: string;
  maxHref: string;
  hours: string;
  desks: ContactDesk[];
};

export const HOME_DEFAULTS: HomeContent = {
  heroTitle: ["Сила в", "ваших руках"],
  heroText:
    "Свой цикл в Таганроге: вязка, облив, комплектация и отгрузка. До 60 000 пар в сутки для предприятий, дистрибьюторов и сетей.",
  stats: [
    { to: 85, label: "регионов отгрузки · 3 страны" },
    { to: 60000, label: "пар в сутки" },
    { to: 7, label: "видов защиты" },
    { to: 80, suffix: "+", label: "позиций в каталоге" },
  ],
  aboutTitle: "Полный цикл: от пряжи до фуры",
  aboutText: `${brand.legal} выпускает линейку ${brand.markRu} на Поляковском шоссе, 17. Прямые контракты по сырью, свой объём и сроки — без чужого склада. Продукция идёт на промышленность, логистику, стройку, машиностроение и торговые сети.`,
  advantages: [
    { title: "Образцы для теста", text: "Пришлём пары на вашу смену — сравните хват, износ и размер до закупки партии." },
    { title: "Более 100 моделей", text: "Семь видов защиты: от ХБ с ПВХ до жаропрочных, МБС, КЩС, краг и рукавиц." },
    { title: "До 60 000 пар в сутки", text: "Собственный цикл в Таганроге: вязка, облив, комплектация и отгрузка." },
    { title: "Доставка по России", text: "Сравните СДЭК, ДЛ, ПЭК и «Энергию» или запросите расчёт менеджером." },
    { title: "Контроль качества", text: "Проверяем сырьё, вязку и покрытие. Несоответствие — замена или возврат." },
    { title: "Маркировка под бренд", text: "Евро-подвесы, ярлыки и упаковка для DIY-сетей и дистрибьюторов." },
  ],
  terms: [
    "Заказ без регистрации — укажите получателя и адрес.",
    "Личный кабинет подтягивает реквизиты, историю и повтор заказа.",
    "Оплата: счёт с сайта, счёт от менеджера или онлайн.",
    "Минимальная фасовка указана в карточке. Опт и сеть — по запросу.",
  ],
  reviewsTitle: "Кто берёт и не уходит",
  reviews,
  stamps: passageStamps,
  ctaTitle: "Нужен расчёт партии?",
  ctaText:
    "Напишите объём и город. В рабочее время менеджер отвечает за несколько минут. Заявка уходит лидом в Битрикс24.",
  featuredProducts: [],
  featuredPosts: [],
};

export const ABOUT_DEFAULTS: AboutContent = {
  lead: `${brand.legal} выпускает СИЗ для рук на ${brand.address}. ${brand.markRu} сменил витрину «Фабрики перчаток», производство осталось здесь же.`,
  note: "Вязка, облив, комплектация и отгрузка — один контур. Срочная партия возможна, если окно на оборудовании реально есть.",
  capacity: 60000,
  whyLead: [
    {
      title: "Образцы на вашу смену",
      text: "Присылаем пары до закупки партии — сравните хват, размер и износ на реальной работе, а не по фото в каталоге.",
    },
    {
      title: "Более 250 моделей",
      text: "ХБ, нитрил, жаропрочные, МБС, КЩС, краги и рукавицы. Подбираем покрытие и плотность под нагрузку, а не «что есть на складе».",
    },
    {
      title: "Полный цикл в Таганроге",
      text: "Вязка, облив, комплектация и отгрузка — один контур. До 60 000 пар в сутки с Поляковского шоссе, 17.",
    },
  ],
  modelsCount: 250,
  regions: 85,
  geo: [
    ["Таганрог", "Склад и самовывоз, Поляковское шоссе, 17"],
    ["ЮФО", "1–3 дня · Ростов, Краснодар, Волгоград"],
    ["ЦФО и СЗФО", "2–5 дней · Москва, Петербург"],
    ["Урал и Поволжье", "3–6 дней"],
    ["Сибирь и Дальний Восток", "5–10 дней · сборные ТК"],
    ["Беларусь и Казахстан", "Отгрузка по ЕАЭС, срок по согласованию"],
  ],
  documents: DEFAULT_DOCS,
};

export const DELIVERY_DEFAULTS: DeliveryContent = {
  intro: [
    "Ориентировочные тарифы СДЭК, Деловых линий, ПЭК и «Энергии» плюс самовывоз с площадки в Таганроге. Те же котировки подставляются на оформлении заказа.",
  ],
  terms: [
    { title: "Виджеты ТК", text: "Три iframe на одной странице. Честно, но тяжёлый UX и три разных UI." },
    { title: "Сравнение в нашей таблице", text: "Как здесь: один запрос, сортировка, выбор ТК в заказе. В бою — живые API." },
    { title: "Агрегатор", text: "ApiShip / CDEK + ДЛ через одного подрядчика. Меньше интеграций, комиссия." },
  ],
};

export const CONTACTS_DEFAULTS: SiteContacts = {
  phone: brand.phone,
  phoneHref: brand.phoneHref,
  email: brand.email,
  address: brand.address,
  maxHref: brand.maxHref,
  hours: "Пн–Пт 8:00–17:00",
  desks: [
    { title: "Розница и мелкий опт", phone: "+7 988 577-73-04", phoneHref: "tel:+79885777304", email: "zevs-magazine@yandex.ru" },
    { title: "Закупки и логистика", phone: "+7 988 577-73-94", phoneHref: "tel:+79885777394", email: "zevs-zakup@yandex.ru" },
    { title: "Бухгалтерия", email: "zevs-glavbuh@yandex.ru" },
  ],
};

export const PRIVACY_DEFAULTS: string[] = [
  `Оператор: ${brand.legal}, ИНН ${brand.inn}, ОГРН ${brand.ogrn}, Ростовская обл., г. Таганрог, ул. Поляковское шоссе, зд. 17. Сайт бренда ${brand.markRu}.`,
  "Сайт обрабатывает имя, телефон, email, наименование организации и адрес доставки, которые пользователь указывает в формах заказа, регистрации и обратной связи. Цели: обработка заявок, консультации, исполнение договоров поставки, связь по заказу.",
  "Правовое основание — согласие субъекта и исполнение договора. Данные могут передаваться в 1С и Битрикс24 как в корпоративные системы оператора. Срок хранения — до достижения целей либо отзыва согласия, если иное не требуется законом.",
  `Обращения по персональным данным: zevsdir@yandex.ru. Актуальная редакция публикуется на этой странице. Текст для прототипа сокращён относительно полной политики на ${brand.domain}.`,
];

/** Slug страницы pages, заменяющей текст политики ПДн. */
export const PRIVACY_PAGE_SLUG = "privacy";

const text = (v: string | null | undefined, d: string) => (v?.trim() ? v.trim() : d);
const num = (v: number | null | undefined, d: number) => (typeof v === "number" && v > 0 ? v : d);
const rows = <R, T>(v: R[] | null | undefined, map: (r: R) => T, d: T[]) => (v?.length ? v.map(map) : d);
const paragraphs = (v: unknown, d: string[]) => {
  const p = lexicalToParagraphs(v);
  return p.length ? p : d;
};
const slugs = (v: (number | { slug?: string | null })[] | null | undefined) =>
  (v ?? []).flatMap((r) => (typeof r === "object" && r.slug ? [r.slug] : [])); // неопубликованное приходит id — пропускаем
const mediaUrl = (m: unknown) => (m && typeof m === "object" && "url" in m && typeof m.url === "string" ? m.url : "");
/** Ссылка из админки: только http(s), иначе дефолт (javascript: и прочее не пропускаем). */
const httpUrl = (v: string | null | undefined, d: string) => (v && /^https?:\/\//i.test(v.trim()) ? v.trim() : d);
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export function mapHome(doc: Partial<Home> | null | undefined): HomeContent {
  const d = HOME_DEFAULTS;
  const title = (doc?.heroTitle ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  return {
    heroTitle: title.length ? title : d.heroTitle,
    heroText: text(doc?.heroText, d.heroText),
    stats: rows(doc?.stats, (s) => ({ to: s.value, ...(s.suffix ? { suffix: s.suffix } : {}), label: s.label }), d.stats),
    aboutTitle: text(doc?.aboutTitle, d.aboutTitle),
    aboutText: text(doc?.aboutText, d.aboutText),
    advantages: rows(doc?.advantages, (a) => ({ title: a.title, text: a.text }), d.advantages),
    terms: rows(doc?.terms, (t) => t.text, d.terms),
    reviewsTitle: text(doc?.reviewsTitle, d.reviewsTitle),
    reviews: rows(
      doc?.reviews,
      (r) => ({ company: r.company, city: r.city ?? "", line: r.line ?? "", text: r.text, fact: r.fact ?? "" }),
      d.reviews,
    ),
    stamps: rows(doc?.stamps, (s) => ({ label: s.label, redacted: false }), d.stamps),
    ctaTitle: text(doc?.ctaTitle, d.ctaTitle),
    ctaText: text(doc?.ctaText, d.ctaText),
    featuredProducts: slugs(doc?.featuredProducts),
    featuredPosts: slugs(doc?.featuredPosts),
  };
}

export function mapAbout(doc: Partial<About> | null | undefined): AboutContent {
  const d = ABOUT_DEFAULTS;
  const [lead, ...note] = lexicalToParagraphs(doc?.text);
  return {
    lead: lead ?? d.lead,
    note: lead ? note.join(" ") : d.note,
    capacity: num(doc?.capacity, d.capacity),
    whyLead: rows(doc?.whyLead, (w) => ({ title: w.title, text: w.text }), d.whyLead),
    modelsCount: num(doc?.modelsCount, d.modelsCount),
    regions: num(doc?.regions, d.regions),
    geo: rows(doc?.geo, (g): [string, string] => [g.title, g.detail], d.geo),
    documents: (() => {
      const docs = (doc?.documents ?? []).map((x) => ({ title: x.title, href: mediaUrl(x.file) })).filter((x) => x.href);
      return docs.length ? docs : d.documents;
    })(),
  };
}

export function mapDelivery(doc: Partial<Delivery> | null | undefined): DeliveryContent {
  return {
    intro: paragraphs(doc?.intro, DELIVERY_DEFAULTS.intro),
    terms: rows(doc?.terms, (t) => ({ title: t.title, text: t.text }), DELIVERY_DEFAULTS.terms),
  };
}

export function mapContacts(doc: Partial<Setting> | null | undefined): SiteContacts {
  const d = CONTACTS_DEFAULTS;
  const c = doc?.contacts;
  const phone = text(c?.phone, d.phone);
  return {
    phone,
    phoneHref: phone === d.phone ? d.phoneHref : telHref(phone),
    email: text(c?.email, d.email),
    address: text(c?.address, d.address),
    maxHref: httpUrl(c?.max, d.maxHref),
    hours: text(c?.hours, d.hours),
    desks: rows(
      c?.desks,
      (k) => ({
        title: k.title,
        ...(k.phone ? { phone: k.phone, phoneHref: telHref(k.phone) } : {}),
        email: k.email,
      }),
      d.desks,
    ),
  };
}

export function mapPageParagraphs(doc: Partial<Page> | null | undefined, d: string[]): string[] {
  return paragraphs(doc?.content, d);
}

/** Товары главной: выбор редактора в порядке выбора, иначе бейдж «На главной» (первые 8, как в прототипе). */
export function pickHomeProducts(products: Product[], featured: string[]): Product[] {
  if (!featured.length) return products.filter((p) => p.featured).slice(0, 8);
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  return featured.flatMap((s) => bySlug.get(s) ?? []);
}

/** Статьи главной: выбор редактора, иначе флаг «Показывать на главной» (первые 3). */
export function pickHomeArticles(articles: Article[], featured: string[]): Article[] {
  if (!featured.length) return articles.filter((a) => a.home !== false).slice(0, 3);
  const bySlug = new Map(articles.map((a) => [a.slug, a]));
  return featured.flatMap((s) => bySlug.get(s) ?? []).slice(0, 3);
}
