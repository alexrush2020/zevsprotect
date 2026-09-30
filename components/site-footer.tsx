import Link from "next/link";
import { Logo } from "@/components/logo";
import { Messengers } from "@/components/messengers";
import { categories } from "@/lib/data/catalog";
import { brand } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-ink text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
            {brand.taglineUpper}
          </p>
          <p className="max-w-xs text-sm text-paper/65">
            {brand.markRu} — собственное производство защитных и рабочих
            перчаток в Таганроге. Опт для предприятий, дистрибьюторов и
            DIY-сетей.
          </p>
          <Messengers />
        </div>
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/55">
            Каталог
          </p>
          <ul className="space-y-2 text-sm text-paper/70">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/catalog?category=${c.slug}`} className="hover:text-white">
                  {c.short}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/55">
            Компания
          </p>
          <ul className="space-y-2 text-sm text-paper/70">
            <li>
              <Link href="/about" className="hover:text-white">
                О производстве
              </Link>
            </li>
            <li>
              <Link href="/samples" className="hover:text-white">
                Образцы
              </Link>
            </li>
            <li>
              <Link href="/calculation" className="hover:text-white">
                Расчёт поставки
              </Link>
            </li>
            <li>
              <Link href="/price" className="hover:text-white">
                Прайс-лист
              </Link>
            </li>
            <li>
              <Link href="/delivery" className="hover:text-white">
                Доставка и ТК
              </Link>
            </li>
            <li>
              <Link href="/track" className="hover:text-white">
                Отследить заказ
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white">
                Политика ПДн
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-white">
                Админ-панель
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm text-paper/70">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/55">
            Контакты
          </p>
          <p>{brand.address}</p>
          <p className="mt-2">
            <a href={brand.phoneHref} className="hover:text-white">
              {brand.phone}
            </a>
          </p>
          <p>
            <a href={`mailto:${brand.email}`} className="hover:text-white">
              {brand.email}
            </a>
          </p>
          <p className="mt-2 text-xs text-paper/45">Пн–Пт 8:00–17:00</p>
          <p className="mt-4 text-xs text-paper/45">
            {brand.legal} · ИНН {brand.inn}
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-white/35">
            {brand.mark} · {brand.sister}
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-[11px] uppercase tracking-[0.16em] text-paper/40">
        {brand.tagline} · {brand.domain}
      </div>
    </footer>
  );
}
