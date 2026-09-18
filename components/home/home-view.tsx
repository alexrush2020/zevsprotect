"use client";

import Link from "next/link";
import { ArrowRight, Factory, FlaskConical, ShieldCheck, Truck } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react";
import { Button } from "@/components/ui/button";
import { InquiryDialog } from "@/components/inquiry-dialog";
import { ProductCard } from "@/components/product-card";
import { articles, categories, products, reviews } from "@/lib/data/catalog";
import { formatDate } from "@/lib/format";
import { brand } from "@/lib/brand";
import { HomeHero } from "@/components/home/home-hero";
import { CategoryStrip } from "@/components/home/category-strip";
import { Reveal, Stagger, StaggerItem } from "@/components/home/motion";
import { ProcessContour } from "@/components/home/process-contour";
import { BackToTopGlove } from "@/components/home/back-to-top-glove";

const advantages = [
  {
    title: "Образцы для теста",
    text: "Пришлём пары на вашу смену — сравните хват, износ и размер до закупки партии.",
  },
  {
    title: "Более 100 моделей",
    text: "Семь видов защиты: от ХБ с ПВХ до жаропрочных, МБС, КЩС, краг и рукавиц.",
  },
  {
    title: "До 60 000 пар в сутки",
    text: "Собственный цикл в Таганроге: вязка, облив, комплектация и отгрузка.",
  },
  {
    title: "Доставка по России",
    text: "Сравните СДЭК, ДЛ, ПЭК и «Энергию» или запросите расчёт менеджером.",
  },
  {
    title: "Контроль качества",
    text: "Проверяем сырьё, вязку и покрытие. Несоответствие — замена или возврат.",
  },
  {
    title: "Маркировка под бренд",
    text: "Евро-подвесы, ярлыки и упаковка для DIY-сетей и дистрибьюторов.",
  },
];

const marquee = [
  ...categories.map((c) => c.short.toUpperCase()),
  brand.taglineUpper,
  "ТАГАНРОГ",
  "ОПТ",
];

export function HomeView() {
  const featured = products.filter((p) => p.featured);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.3 });

  return (
    <div className="home-page overflow-x-clip">
      <motion.div
        className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-[2px] origin-left bg-white mix-blend-difference"
        style={{ scaleX: progress }}
        aria-hidden
      />
      <HomeHero />
      <BackToTopGlove />

      <div className="relative overflow-hidden border-y border-white/10 bg-[linear-gradient(90deg,#040040_0%,#040040_28%,#f97316_72%,#f97316_100%)] py-3 text-paper">
        <div className="home-marquee flex w-max gap-10 whitespace-nowrap">
          {[0, 1].map((copy) => (
            <p key={copy} className="flex gap-10 text-[11px] uppercase tracking-[0.32em] text-white">
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

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.22em] text-orange">О компании</p>
            <span className="mt-3 block h-0.5 w-10 bg-orange" />
            <h2 className="mt-2 font-heading text-3xl sm:text-4xl">
              Полный цикл: от пряжи до фуры
            </h2>
            <p className="mt-4 text-steel">
              {brand.legal} выпускает линейку {brand.markRu} на Поляковском
              шоссе, 17. Прямые контракты по сырью, свой объём и сроки — без
              чужого склада. Продукция идёт на промышленность, логистику,
              стройку, машиностроение и торговые сети.
            </p>
            <Link
              href="/about"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium hover:text-orange"
            >
              Смотреть производство <ArrowRight className="size-4" />
            </Link>
          </Reveal>
          <Stagger className="grid grid-cols-2 gap-3" delay={0.1}>
            {[
              [Factory, "Собственный цех"],
              [ShieldCheck, "Сертификация партий"],
              [FlaskConical, "Контроль покрытия"],
              [Truck, "Отгрузка по РФ"],
            ].map(([Icon, label]) => (
              <StaggerItem key={String(label)}>
                <div className="group rounded-2xl border bg-card p-5 transition duration-500 hover:-translate-y-1 hover:border-orange/50 hover:shadow-lg">
                  <Icon className="size-6 text-orange transition duration-500 group-hover:scale-110" />
                  <p className="mt-3 font-medium">{label as string}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <ProcessContour />
      </section>

      <section className="relative overflow-hidden bg-ink py-20 text-paper">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-10 font-heading text-[18vw] leading-none text-white/[0.04]"
          initial={{ x: -40 }}
          whileInView={{ x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          zevs
        </motion.div>
        <div className="relative mx-auto max-w-6xl px-4">
          <Reveal>
            <h2 className="font-heading text-3xl sm:text-4xl">Почему закупают у нас</h2>
          </Reveal>
          <Stagger className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3" delay={0.05}>
            {advantages.map((a) => (
              <StaggerItem key={a.title}>
                <article className="home-shine group h-full rounded-2xl border border-white/10 p-5 transition duration-500 hover:-translate-y-1 hover:border-white/30 hover:bg-white/5">
                  <h3 className="font-heading text-lg text-white">{a.title}</h3>
                  <p className="mt-2 text-sm text-paper/70">{a.text}</p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="py-20">
        <Reveal>
          <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-orange">Каталог</p>
              <span className="mt-3 block h-0.5 w-10 bg-orange" />
              <h2 className="mt-2 font-heading text-3xl sm:text-4xl">Семь видов защиты</h2>
            </div>
            <Link href="/catalog" className="text-sm hover:text-orange">
              Все товары
            </Link>
          </div>
        </Reveal>
        <div className="mx-auto mt-10 max-w-6xl px-4">
          <CategoryStrip />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <Reveal>
          <h2 className="font-heading text-3xl sm:text-4xl">Рекомендуемые модели</h2>
          <p className="mt-2 text-steel">
            Цены и остатки в прототипе соответствуют витрине и помечены как данные
            из 1С.
          </p>
        </Reveal>
        <Stagger className="mt-8 grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <StaggerItem key={p.id} className="h-full min-w-0">
              <ProductCard product={p} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-heading text-3xl sm:text-4xl">Условия покупки</h2>
            <ul className="mt-6 space-y-3 text-steel">
              {[
                "Заказ без регистрации — укажите получателя и адрес.",
                "Личный кабинет подтягивает реквизиты, историю и повтор заказа.",
                "Оплата: счёт с сайта, счёт от менеджера или онлайн.",
                "Минимальная фасовка указана в карточке. Опт и сеть — по запросу.",
              ].map((item, i) => (
                <motion.li
                  key={item}
                  initial={reduce ? false : { opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.08 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="flex gap-3"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-orange" />
                  {item}
                </motion.li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <InquiryDialog
                type="price"
                trigger={<Button className="h-10">Получить прайс</Button>}
              />
              <Button nativeButton={false} render={<Link href="/price" />} variant="outline" className="h-10">
                Прайс на сайте
              </Button>
              <Button nativeButton={false} render={<Link href="/samples" />} variant="outline" className="h-10">
                Образцы
              </Button>
              <Button nativeButton={false} render={<Link href="/delivery" />} variant="outline" className="h-10">
                Сравнить доставку
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.12} y={48}>
            <motion.div
              className="h-full rounded-2xl bg-ink p-8 text-paper"
              whileHover={reduce ? undefined : { scale: 1.015 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">
                Для опта и сетей
              </p>
              <h3 className="mt-2 font-heading text-2xl">Персональные условия</h3>
              <ul className="mt-4 space-y-2 text-sm text-paper/75">
                <li>Индивидуальная маркировка и евро-подвесы</li>
                <li>Производство под ваш бренд</li>
                <li>Подбор покрытия и плотности под нагрузку</li>
                <li>Срочный выпуск — если цех подтверждает окно</li>
              </ul>
            </motion.div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <h2 className="font-heading text-3xl sm:text-4xl">Отзывы закупщиков</h2>
        </Reveal>
        <Stagger className="mt-8 grid gap-4 md:grid-cols-3">
          {reviews.map((r, i) => (
            <StaggerItem key={r.company}>
              <blockquote className="h-full rounded-2xl border bg-card p-5 transition duration-500 hover:-translate-y-1 hover:border-orange/40 hover:shadow-[0_20px_44px_rgb(249_115_22_/_0.38)]">
                <p className="text-sm text-steel">«{r.text}»</p>
                <footer className="mt-4 text-sm font-medium">{r.company}</footer>
                <span className="mt-3 block font-heading text-4xl leading-none text-navy/15">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </blockquote>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <Reveal>
          <div className="flex items-end justify-between">
            <h2 className="font-heading text-3xl sm:text-4xl">Статьи</h2>
            <Link href="/blog" className="text-sm hover:text-orange">
              Все материалы
            </Link>
          </div>
        </Reveal>
        <Stagger className="mt-8 grid auto-rows-fr items-stretch gap-4 md:grid-cols-3">
          {articles.filter((a) => a.home !== false).slice(0, 3).map((a) => (
            <StaggerItem key={a.slug} className="h-full min-w-0">
              <Link
                href={`/blog/${a.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card"
              >
                <div className="aspect-[16/9] overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.image}
                    alt=""
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xs text-steel">
                    {a.category} · {formatDate(a.date)}
                  </p>
                  <h3 className="mt-2 line-clamp-3 font-heading leading-snug">
                    {a.title}
                  </h3>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="relative overflow-hidden bg-ink py-24 text-paper">
        <div className="home-grain absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <h2 className="font-heading text-3xl sm:text-5xl">Нужен расчёт партии?</h2>
            <p className="mt-4 max-w-md text-paper/70">
              Напишите объём и город. В рабочее время менеджер отвечает за
              несколько минут. Заявка уходит лидом в Битрикс24.
            </p>
            <p className="mt-6 text-sm text-paper/55">
              {brand.address}
              <br />
              {brand.phone} · {brand.email}
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="w-full pt-1.5 pb-2">
              <InquiryDialog
                type="consult"
                trigger={
                  <Button className="btn-press-in h-14 w-full bg-orange text-base text-white hover:bg-orange-dk">
                    Оставить заявку на консультацию
                  </Button>
                }
              />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
