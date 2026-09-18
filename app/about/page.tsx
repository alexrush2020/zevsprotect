import Link from "next/link";
import { InquiryDialog } from "@/components/inquiry-dialog";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { brand } from "@/lib/brand";
import { DEFAULT_DOCS } from "@/lib/data/catalog";

const photos = [
  "https://zevsprotect.ru/wp-content/uploads/2026/05/glovefactory-10-05-20211787.jpg",
  "https://zevsprotect.ru/wp-content/uploads/2026/05/glovefactory-10-05-20211781.jpg",
  "https://zevsprotect.ru/wp-content/uploads/2026/05/glovefactory-18-08-20210133.jpg",
  "https://zevsprotect.ru/wp-content/uploads/2026/05/glovefactory-18-08-20210125.jpg",
];

const quality = [
  ["Сырьё", "Входной контроль пряжи, спилка и компаундов до постановки на вязку."],
  ["Вязка", "Класс, плотность и размер сверяются с картой модели."],
  ["Покрытие", "Толщина и рисунок облива — на партии, не «на глаз у отгрузки»."],
  ["Готовая пара", "Выборочный разбор короба. Несоответствие — замена или возврат."],
];

const geo = [
  ["Таганрог", "Склад и самовывоз, Поляковское шоссе, 17"],
  ["ЮФО", "1–3 дня · Ростов, Краснодар, Волгоград"],
  ["ЦФО и СЗФО", "2–5 дней · Москва, Петербург"],
  ["Урал и Поволжье", "3–6 дней"],
  ["Сибирь и Дальний Восток", "5–10 дней · сборные ТК"],
];

export const metadata = { title: "О компании" };

export default function AboutPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-navy py-16 text-paper">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/cover.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-navy/50" />
        <div className="relative mx-auto max-w-6xl px-4">
          <p className="text-xs uppercase tracking-[0.22em] text-white/55">Производство</p>
          <h1 className="mt-3 max-w-3xl font-heading text-4xl sm:text-5xl">
            {brand.markRu} — завод защитных перчаток в Таганроге
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.22em] text-white/45">
            {brand.tagline}
          </p>
          <p className="mt-5 max-w-2xl text-lg text-paper/70">
            {brand.legal} выпускает СИЗ для рук на собственной площадке.{" "}
            {brand.markRu} сменил витрину «Фабрики перчаток», производство
            осталось здесь же: Поляковское шоссе, 17.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
        <div className="space-y-4 text-steel">
          <Logo variant="ru" className="h-24 w-auto" />
          <h2 className="font-heading text-3xl text-ink">Как устроен цех</h2>
          <p>
            Вязка, облив, комплектация и отгрузка идут в одном контуре. Это даёт
            до 60 000 пар в сутки и возможность срочных партий — если окно на
            оборудовании реально есть, а не «обещаем логисты».
          </p>
          <p>
            Для сетей и дистрибьюторов — евро-подвесы, ярлыки и выпуск под бренд
            заказчика.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {photos.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt={`Производство ${brand.markRu}`} className="h-44 w-full rounded-2xl object-cover" />
          ))}
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-heading text-3xl">Контроль качества</h2>
          <p className="mt-3 max-w-2xl text-steel">
            Партия не уходит с браком «на следующую фуру». Если модель не
            проходит этап — останавливаем выпуск и решаем замену.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quality.map(([t, d]) => (
              <div key={t} className="rounded-2xl border p-5">
                <h3 className="font-heading">{t}</h3>
                <p className="mt-2 text-sm text-steel">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-heading text-3xl">География отгрузок</h2>
        <p className="mt-3 max-w-2xl text-steel">
          Отгружаем по всей России. Сроки — ориентир по мокам ТК с этого сайта,
          не оферта перевозчика.
        </p>
        <div className="mt-8 grid gap-3 md:grid-cols-5">
          {geo.map(([t, d]) => (
            <div key={t} className="rounded-2xl border bg-card p-4">
              <p className="font-heading">{t}</p>
              <p className="mt-1 text-sm text-steel">{d}</p>
            </div>
          ))}
        </div>
        <Button nativeButton={false} render={<Link href="/delivery" />} variant="outline" className="mt-6">
          Сравнить ТК
        </Button>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-heading text-3xl">Сертификаты и документы</h2>
          <p className="mt-3 max-w-2xl text-steel">
            Сканы для прототипа. В бою файлы подгружаются к модели из CMS / 1С.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {DEFAULT_DOCS.map((d) => (
              <a
                key={d.href}
                href={d.href}
                className="rounded-2xl border p-5 hover:border-orange"
                target="_blank"
                rel="noreferrer"
              >
                <p className="font-heading">{d.title}</p>
                <p className="mt-1 text-sm text-steel">Скачать PDF-мок</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 rounded-3xl border p-6 lg:grid-cols-[1fr_200px] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "#B4003C" }}>
              Сестринский бренд
            </p>
            <h2 className="mt-2 font-heading text-3xl">{brand.sister}</h2>
            <p className="mt-3 max-w-2xl text-steel">
              Малиновый знак {brand.sister} — текстильная линейка той же группы.
              Этот сайт продаёт перчатки {brand.markRu}. Спецодежду и ткани
              {brand.sister} сюда не смешиваем: другой ассортимент и другой
              ведущий цвет (#B4003C).
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/zevstex.png" alt={brand.sister} className="mx-auto h-20 w-auto" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="font-heading text-3xl">Кому отгружаем</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            "Промышленность",
            "Логистика",
            "Стройка",
            "Снабжение",
            "Торговые сети",
            "Машиностроение",
            "Дистрибьюторы СИЗ",
          ].map((t) => (
            <span key={t} className="rounded-full border px-4 py-1.5 text-sm">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <InquiryDialog
            type="consult"
            trigger={<Button className="h-11">Стать клиентом</Button>}
          />
          <Button nativeButton={false} render={<Link href="/catalog" />} variant="outline" className="h-11">
            Смотреть каталог
          </Button>
          <Button nativeButton={false} render={<Link href="/samples" />} variant="outline" className="h-11">
            Заказать образцы
          </Button>
        </div>
      </section>
    </div>
  );
}
