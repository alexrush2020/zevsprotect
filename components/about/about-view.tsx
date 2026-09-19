"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useScroll, useSpring } from "motion/react";
import { WorkshopReel } from "@/components/about/workshop-reel";
import { MetallicLogo } from "@/components/about/metallic-logo";
import { GeoBoard } from "@/components/about/geo-board";
import { InquiryDialog } from "@/components/inquiry-dialog";
import { Button } from "@/components/ui/button";
import { CategoryStrip } from "@/components/home/category-strip";
import { ProcessContour } from "@/components/home/process-contour";
import { BackToTopGlove } from "@/components/home/back-to-top-glove";
import { CountUp, Reveal } from "@/components/home/motion";
import { brand } from "@/lib/brand";
import { DEFAULT_DOCS, reviews } from "@/lib/data/catalog";

const marquee = [
  "ПРОМЫШЛЕННОСТЬ",
  "ЛОГИСТИКА",
  "СТРОЙКА",
  "СНАБЖЕНИЕ",
  "ТОРГОВЫЕ СЕТИ",
  "МАШИНОСТРОЕНИЕ",
  brand.taglineUpper,
  "ТАГАНРОГ",
];

const whyLead = [
  [
    "Образцы на вашу смену",
    "Присылаем пары до закупки партии — сравните хват, размер и износ на реальной работе, а не по фото в каталоге.",
  ],
  [
    "Более 250 моделей",
    "ХБ, нитрил, жаропрочные, МБС, КЩС, краги и рукавицы. Подбираем покрытие и плотность под нагрузку, а не «что есть на складе».",
  ],
  [
    "Полный цикл в Таганроге",
    "Вязка, облив, комплектация и отгрузка — один контур. До 60 000 пар в сутки с Поляковского шоссе, 17.",
  ],
];

const whyTicker = [
  "85 регионов + ЕАЭС",
  "Контроль сырья, вязки и покрытия",
  "Маркировка и выпуск под бренд",
  "Срочный заказ — если окно на станке есть",
];

const geo = [
  ["Таганрог", "Склад и самовывоз, Поляковское шоссе, 17"],
  ["ЮФО", "1–3 дня · Ростов, Краснодар, Волгоград"],
  ["ЦФО и СЗФО", "2–5 дней · Москва, Петербург"],
  ["Урал и Поволжье", "3–6 дней"],
  ["Сибирь и Дальний Восток", "5–10 дней · сборные ТК"],
  ["Беларусь и Казахстан", "Отгрузка по ЕАЭС, срок по согласованию"],
] as const;

const conditions = [
  ["01", "Маркировка", "Евро-подвесы и ярлыки под сеть или объект."],
  ["02", "Свой бренд", "Модель, упаковка и логотип заказчика."],
  ["03", "Подбор", "Покрытие и плотность под реальную нагрузку."],
  ["04", "Срочно", "Берём в работу, если цех подтверждает окно."],
  ["05", "Опт", "Условия под объём и регулярные закупки."],
];

export function AboutView() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.3 });

  return (
    <div className="overflow-x-clip">
      <motion.div
        className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-[2px] origin-left bg-white mix-blend-difference"
        style={{ scaleX: progress }}
        aria-hidden
      />
      <BackToTopGlove />

      <section className="relative isolate overflow-hidden bg-navy text-paper">
        <div className="home-grain pointer-events-none absolute inset-0 opacity-30" />
        <p className="pointer-events-none absolute top-[46%] left-3 z-[1] hidden origin-center -translate-y-1/2 -rotate-90 text-[10px] tracking-[0.52em] text-white/30 uppercase xl:block">
          {brand.mark} · taganrog
        </p>

        <div className="relative grid min-h-[calc(100svh-6.25rem)] lg:grid-cols-[minmax(22rem,0.92fr)_minmax(0,1.18fr)]">
          <div className="flex flex-col justify-end px-4 pb-12 pt-28 sm:px-8 sm:pb-16 lg:py-20 xl:pl-[max(1rem,calc((100vw-72rem)/2+1rem))]">
            <MetallicLogo variant="ru" tone="chrome" className="h-20 sm:h-28 md:h-32" />
            <p className="mt-8 text-xs uppercase tracking-[0.22em] text-orange">
              Полный цикл · Таганрог · Пн–Пт 8:00–17:00
            </p>
            <h1 className="mt-3 max-w-xl font-heading text-4xl leading-[0.95] sm:text-6xl">
              Как устроен цех
            </h1>
            <p className="mt-5 max-w-md text-lg text-paper/75">
              {brand.legal} выпускает СИЗ для рук на {brand.address}. {brand.markRu}{" "}
              сменил витрину «Фабрики перчаток», производство осталось здесь же.
            </p>
            <p className="mt-3 max-w-md text-sm text-paper/50">
              Вязка, облив, комплектация и отгрузка — один контур. Срочная партия
              возможна, если окно на оборудовании реально есть.
            </p>
            <p className="mt-10 font-heading text-[clamp(2.75rem,5.4vw,5.25rem)] leading-none tracking-[-0.04em]">
              <CountUp to={60000} />
            </p>
            <p className="mt-3 text-sm uppercase tracking-[0.22em] text-orange">
              пар в сутки с одной площадки
            </p>
          </div>
          <WorkshopReel variant="cinema" className="min-h-[22rem] lg:h-full" />
        </div>

        <div className="relative overflow-hidden border-t border-white/10 bg-[linear-gradient(90deg,#040040_0%,#040040_28%,#f97316_72%,#f97316_100%)] py-3">
          <div className="home-marquee flex w-max whitespace-nowrap">
            {[0, 1, 2, 3].map((copy) => (
              <p
                key={copy}
                aria-hidden={copy > 0}
                className="flex shrink-0 gap-10 pr-10 text-[11px] uppercase tracking-[0.32em] text-white"
              >
                {marquee.map((item) => (
                  <span key={`${copy}-${item}`} className="flex items-center gap-10">
                    {item}
                    <span className="inline-block size-1 rounded-full bg-white/40" />
                  </span>
                ))}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 lg:h-[min(38rem,calc(100svh-6.25rem))]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/about/pile-glove.png"
          alt="Рабочая перчатка зевспротект на кувалде при забивке сваи"
          className="h-72 w-full object-cover object-[center_28%] lg:h-full lg:min-h-0"
        />
        <div className="flex flex-col justify-center bg-paper px-4 py-12 sm:px-10 lg:px-16 lg:py-10">
          {whyLead.map(([title, text]) => (
            <article key={title} className="border-t border-navy/10 py-8 first:border-t-0 first:pt-0 last:pb-0">
              <h2 className="font-heading text-3xl leading-tight text-ink sm:text-4xl">{title}</h2>
              <p className="mt-3 max-w-md text-steel">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="overflow-hidden bg-orange py-4 text-navy">
        <div className="home-marquee flex w-max whitespace-nowrap">
          {[0, 1, 2].map((copy) => (
            <p
              key={copy}
              aria-hidden={copy > 0}
              className="flex shrink-0 gap-10 pr-10 text-sm font-medium uppercase tracking-[0.28em]"
            >
              {whyTicker.map((item) => (
                <span key={`${copy}-${item}`} className="flex items-center gap-10">
                  {item}
                  <span className="inline-block size-1.5 rounded-full bg-navy/40" />
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>

      <section className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-orange">Контроль</p>
            <h2 className="mx-auto mt-2 max-w-xl font-heading text-4xl sm:text-6xl">
              Партия не уходит с браком
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-steel">
              Следим за качеством на всех этапах. Если модель не проходит —
              останавливаем выпуск и решаем замену, не прячем брак в следующую фуру.
            </p>
          </Reveal>
          <ProcessContour />
        </div>
      </section>

      <section className="bg-navy py-20 text-paper sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-orange">Ассортимент</p>
              <h2 className="mt-2 font-heading text-4xl sm:text-6xl">Семь видов защиты</h2>
              <p className="mt-3 max-w-xl text-paper/65">
                Наведите на полосу — раскроется кадр. Более <CountUp to={250} /> моделей
                под разные условия.
              </p>
            </div>
            <Button
              nativeButton={false}
              render={<Link href="/catalog" />}
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              Весь каталог <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
        <div className="mt-10">
          <CategoryStrip />
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto grid max-w-6xl items-stretch gap-8 px-4 py-8 sm:py-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-10 lg:py-0">
          <div className="flex flex-col justify-center py-6 lg:py-8">
            <p className="text-xs uppercase tracking-[0.22em] text-orange">География</p>
            <p className="font-heading text-[clamp(4.5rem,16vw,9rem)] leading-[0.75] tabular-nums text-navy">
              <CountUp to={85} duration={1} ease="linear" />
            </p>
            <p className="mt-4 max-w-sm text-steel">
              регионов отгрузки. Плюс Беларусь и Казахстан. Сроки — ориентир по
              мокам ТК, не оферта перевозчика.
            </p>
            <Button
              nativeButton={false}
              render={<Link href="/delivery" />}
              variant="outline"
              className="mt-6 self-start"
            >
              Сравнить ТК
            </Button>
          </div>
          <GeoBoard rows={geo} />
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink py-20 text-paper sm:py-28">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/about/packing-glove.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-ink/80" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
          <div className="border border-dashed border-white/25 bg-ink/70 p-6 sm:p-10">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Наряд на партию</p>
                <h2 className="mt-3 font-heading text-4xl sm:text-5xl">Персональные условия</h2>
              </div>
              <p className="hidden size-24 shrink-0 rotate-[-12deg] items-center justify-center rounded-full border-[3px] border-orange text-center text-[11px] font-heading leading-tight tracking-[0.16em] text-orange uppercase sm:grid">
                опт
                <span className="block text-[9px] tracking-[0.12em]">под объём</span>
              </p>
            </div>
            <ol className="mt-8 divide-y divide-white/10">
              {conditions.map(([n, title, text]) => (
                <li
                  key={n}
                  className="grid grid-cols-[2.5rem_1fr] items-baseline gap-x-3 gap-y-1 py-4 sm:grid-cols-[3rem_minmax(0,8rem)_1fr] sm:gap-4"
                >
                  <span className="font-heading text-orange">{n}</span>
                  <span className="font-heading">{title}</span>
                  <span className="col-start-2 text-sm text-paper/65 sm:col-start-auto">{text}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col justify-between border border-white/10 bg-navy/80 p-6 sm:p-8">
            <div>
              <p className="font-heading text-2xl">Документы к партии</p>
              <p className="mt-3 text-sm text-paper/55">
                Сканы для прототипа. В бою файлы подгружаются к модели из CMS / 1С.
              </p>
            </div>
            <div className="mt-8 space-y-1">
              {DEFAULT_DOCS.map((d) => (
                <a
                  key={d.href}
                  href={d.href}
                  className="flex items-center justify-between border-b border-white/10 py-4 text-sm hover:text-orange"
                  target="_blank"
                  rel="noreferrer"
                >
                  {d.title}
                  <span className="text-[11px] tracking-[0.18em] text-white/35 uppercase">PDF</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <p className="text-xs uppercase tracking-[0.22em] text-orange">Проходная</p>
        <h2 className="mt-2 font-heading text-4xl sm:text-6xl">Что говорят закупщики</h2>
        <blockquote className="mt-12 max-w-5xl">
          <p className="font-heading text-3xl leading-[1.15] text-ink sm:text-5xl">
            «{reviews[0].text}»
          </p>
          <footer className="mt-6 flex flex-wrap items-baseline gap-3">
            <cite className="font-heading text-xl not-italic">{reviews[0].company}</cite>
            <span className="text-xs uppercase tracking-[0.16em] text-orange">{reviews[0].fact}</span>
          </footer>
        </blockquote>
        <div className="mt-16 grid gap-10 border-t pt-12 md:grid-cols-2">
          {reviews.slice(1).map((review) => (
            <blockquote key={review.company}>
              <p className="text-xl leading-snug text-ink sm:text-2xl">«{review.text}»</p>
              <footer className="mt-4 flex flex-wrap items-baseline gap-3">
                <cite className="font-heading not-italic">{review.company}</cite>
                <span className="text-xs uppercase tracking-[0.16em] text-orange">{review.fact}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#B4003C] py-16 text-white sm:py-20">
        <p
          aria-hidden
          className="about-outline about-outline-light pointer-events-none absolute -bottom-6 left-0 text-[18vw] font-heading"
        >
          зевстекс
        </p>
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-8 px-4">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Сестринский бренд</p>
            <h2 className="mt-2 font-heading text-4xl sm:text-5xl">{brand.sister}</h2>
            <p className="mt-4 text-white/80">
              Текстильная линейка той же группы. Этот сайт продаёт перчатки{" "}
              {brand.markRu}. Спецодежду и ткани {brand.sister} сюда не смешиваем.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/zevstex.png" alt={brand.sister} className="h-16 w-auto brightness-0 invert sm:h-20" />
        </div>
      </section>

      <section className="relative overflow-hidden bg-navy py-24 text-paper sm:py-32">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero/fenix.png"
          alt=""
          className="pointer-events-none absolute right-[-8%] bottom-[-18%] hidden h-[92%] w-auto object-contain opacity-80 lg:block"
        />
        <div className="home-grain pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-6xl px-4">
          <h2 className="max-w-xl font-heading text-4xl sm:text-6xl">
            Хотите удостовериться в качестве наших перчаток?
          </h2>
          <p className="mt-4 max-w-md text-lg text-paper/70">
            Закажите бесплатные образцы — сравните хват и износ на своей смене.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <InquiryDialog
              type="samples"
              trigger={<Button className="h-12 px-6">Заказать образцы</Button>}
            />
            <InquiryDialog
              type="consult"
              trigger={
                <Button variant="outline" className="h-12 border-white/20 bg-transparent px-6 text-white hover:bg-white/10">
                  Стать клиентом
                </Button>
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
}
