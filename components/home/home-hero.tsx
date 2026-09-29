"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { InquiryDialog } from "@/components/inquiry-dialog";
import { brand } from "@/lib/brand";
import { CountUp, easeOutExpo } from "@/components/home/motion";

const headline = ["Сила в", "ваших руках"];

const industries = [
  "Промышленность",
  "Логистика",
  "Стройка",
  "Машиностроение",
  "DIY-сети",
];

const stats: {
  to: number;
  suffix?: string;
  label: string;
}[] = [
  { to: 85, label: "регионов отгрузки · 3 страны" },
  { to: 60000, label: "пар в сутки" },
  { to: 7, label: "видов защиты" },
  { to: 80, suffix: "+", label: "позиций в каталоге" },
];

// Округление до 3 знаков: Math.sin больших аргументов в Node и браузере расходится
// в младших разрядах, без него — ошибка гидрации.
const round3 = (x: number) => Math.round(x * 1000) / 1000;
const motes = Array.from({ length: 39 }, (_, i) => {
  const n = Math.sin(i * 12.9898) * 43758.5453;
  const r = round3(n - Math.floor(n));
  const n2 = Math.sin(i * 78.233) * 24634.841;
  const r2 = round3(n2 - Math.floor(n2));
  return {
    left: `${6 + r * 88}%`,
    size: r2 > 0.78 ? 3 : r2 > 0.4 ? 2 : 1,
    duration: 11 + r * 10,
    delay: -(r2 * 18),
    opacity: 0.18 + r * 0.4,
    drift: `${(r2 - 0.5) * 48}px`,
  };
});

export function HomeHero() {
  const reduce = useReducedMotion();

  return (
    <section className="hero-stage relative h-[calc(100svh-var(--site-header-h,5.65625rem))] overflow-hidden text-paper">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="hero-beam" />
        <div className="hero-grid" />
        {!reduce
          ? motes.map((m, i) => (
              <span
                key={i}
                className="hero-mote"
                style={{
                  left: m.left,
                  width: m.size,
                  height: m.size,
                  ["--mote-d" as string]: `${m.duration}s`,
                  ["--mote-delay" as string]: `${m.delay}s`,
                  ["--mote-o" as string]: m.opacity,
                  ["--mote-x" as string]: m.drift,
                }}
              />
            ))
          : null}
        <div className="hero-vignette" />
      </div>

      <p className="pointer-events-none absolute top-[42%] left-3 hidden origin-center -translate-y-1/2 -rotate-90 text-[10px] tracking-[0.52em] text-white/25 uppercase xl:block">
        {brand.mark} · taganrog
      </p>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 bottom-[6.75rem] z-[1] flex items-center"
        aria-hidden
      >
        <div className="mx-auto grid h-full w-full max-w-6xl items-center px-4 lg:grid-cols-2">
          <div className="hidden lg:block" />
          <div className="relative mx-auto w-[min(72vw,380px)] opacity-40 sm:w-[min(42vw,420px)] lg:w-[min(88%,480px)] lg:opacity-100">
          <div className="hero-floor" />
          <div className="hero-glove-glow" />
          <motion.div
            className="relative"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.15, delay: 0.2, ease: easeOutExpo }}
          >
            <motion.img
              src="/hero/fenix.png"
              alt=""
              className="relative z-[1] w-full"
              animate={
                reduce
                  ? undefined
                  : { y: [0, -10, 0], rotate: [-2, 2.4, -2] }
              }
              transition={{
                duration: 9,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        </div>
        </div>
      </div>

      <div className="relative z-[2] flex h-full min-h-0 flex-col">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-10 lg:w-full lg:max-w-6xl">
          <div className="lg:max-w-[54%]">
          <motion.p
            className="text-[11px] tracking-[0.32em] text-orange uppercase"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.06, ease: easeOutExpo }}
          >
            Собственное производство
          </motion.p>
          <motion.p
            className="mt-3 text-sm tracking-[0.18em] text-white/55 uppercase"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: easeOutExpo }}
          >
            Производитель промышленных СИЗ для рук
          </motion.p>
          <h1 className="font-heading mt-4 text-[clamp(2.7rem,7.2vw,6.4rem)] leading-[0.92] font-semibold tracking-tight [perspective:900px]">
            {headline.map((line, i) => (
              <motion.span
                key={line}
                className="block"
                initial={reduce ? false : { opacity: 0, y: 56, rotateX: 42 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  duration: 0.95,
                  delay: 0.16 + i * 0.12,
                  ease: easeOutExpo,
                }}
              >
                {line}
              </motion.span>
            ))}
          </h1>
          <motion.p
            className="mt-6 max-w-md text-base text-white/72 sm:text-lg"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.48, ease: easeOutExpo }}
          >
            Свой цикл в Таганроге: вязка, облив, комплектация и отгрузка.
            До 60 000 пар в сутки для предприятий, дистрибьюторов и сетей.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap gap-3"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.62, ease: easeOutExpo }}
          >
            <Button
                nativeButton={false}
                render={<Link href="/catalog" />}
                className="btn-press-in h-11 bg-orange px-5 text-white hover:bg-orange-dk"
              >
                Открыть каталог
                <ArrowRight data-icon="inline-end" />
              </Button>
            <InquiryDialog
              type="samples"
              trigger={
                <Button
                  variant="outline"
                  className="h-11 border-white/25 bg-transparent px-5 text-paper hover:border-orange hover:bg-orange hover:text-white"
                >
                  Заказать образцы
                </Button>
              }
            />
          </motion.div>
          <motion.p
            className="mt-8 hidden text-[11px] tracking-[0.18em] text-white/40 uppercase sm:block xl:whitespace-nowrap"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.85 }}
          >
            {industries.join(" · ")}
          </motion.p>
          </div>
        </div>

        <div className="border-t border-white/10 bg-black/45">
        <div className="mx-auto grid max-w-6xl grid-cols-2 px-4 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="px-3 py-4 sm:px-4 sm:py-5"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.65,
                delay: 0.55 + i * 0.08,
                ease: easeOutExpo,
              }}
            >
              <p className="font-heading text-2xl text-white sm:text-3xl">
                <CountUp to={s.to} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-[11px] tracking-wide text-white/50">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}
