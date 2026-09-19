"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { passageStamps, reviews } from "@/lib/data/catalog";
import { canHoverOpenPlate, nextOpenPlate } from "@/lib/passage-board";
import { Reveal } from "@/components/home/motion";
import { cn } from "@/lib/utils";

function useFineHover() {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return fine;
}

export function PassageBoard() {
  const reduce = useReducedMotion();
  const fineHover = useFineHover();
  const hoverOpens = canHoverOpenPlate(fineHover, fineHover);
  const [open, setOpen] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);

  function openByHover(index: number) {
    if (hoverOpens) setOpen(index);
  }

  function leaveHover(index: number) {
    if (!hoverOpens || focused === index) return;
    setOpen((current) => (current === index ? null : current));
  }

  function press(index: number) {
    if (hoverOpens) {
      setOpen(index);
      return;
    }
    setOpen(nextOpenPlate(open, index));
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setOpen(nextOpenPlate(open, index));
  }

  return (
    <section className="relative overflow-hidden bg-ink py-20 text-paper">
      <div className="home-grain absolute inset-0 opacity-40" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-10 top-8 font-heading text-[16vw] leading-none text-white/[0.04] uppercase"
        initial={reduce ? false : { x: -40 }}
        whileInView={{ x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        ПРОХОДНАЯ
      </motion.div>

      <div className="relative mx-auto max-w-6xl px-4">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.22em] text-orange">
            Отзывы
          </p>
          <span className="mt-3 block h-0.5 w-10 bg-orange" />
          <h2 className="mt-2 font-heading text-3xl sm:text-4xl">
            Кто берёт и не уходит
          </h2>
        </Reveal>

        <div className="relative mt-12">
          <div
            aria-hidden
            className="absolute inset-x-0 top-7 h-1 bg-white/15 shadow-[0_1px_0_rgb(0_0_0_/_0.4)]"
          />
          <ul className="relative grid gap-4 md:grid-cols-3">
            {reviews.map((plate, index) => {
              const expanded = open === index;
              const slotId = `passage-slot-${index}`;
              return (
                <li key={plate.company} className="h-full">
                  <motion.div
                    className={cn(
                      "relative flex h-full flex-col rounded-sm border bg-[#0b0b18] transition-opacity duration-200",
                      expanded
                        ? "border-orange/70"
                        : "border-white/15",
                      open !== null && !expanded && "opacity-45",
                    )}
                    animate={{ y: expanded && !reduce ? 12 : 0 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    onMouseEnter={() => openByHover(index)}
                    onMouseLeave={() => leaveHover(index)}
                  >
                    <span aria-hidden className="absolute left-3 top-2 size-1.5 rounded-full bg-white/25" />
                    <span aria-hidden className="absolute right-3 top-2 size-1.5 rounded-full bg-white/25" />
                    <span aria-hidden className="absolute bottom-2 left-3 size-1.5 rounded-full bg-white/25" />
                    <span aria-hidden className="absolute bottom-2 right-3 size-1.5 rounded-full bg-white/25" />
                    <button
                      type="button"
                      className="w-full px-5 pb-4 pt-6 text-left"
                      aria-expanded={expanded}
                      aria-controls={slotId}
                      onClick={() => press(index)}
                      onKeyDown={(event) => onKeyDown(index, event)}
                      onFocus={() => setFocused(index)}
                      onBlur={() => {
                        setFocused((current) => (current === index ? null : current));
                        if (hoverOpens) setOpen((current) => (current === index ? null : current));
                      }}
                    >
                      <p className="font-heading text-xl uppercase tracking-[0.12em]">
                        {plate.company}
                      </p>
                      {plate.city ? (
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">
                          {plate.city}
                        </p>
                      ) : null}
                      <p className="mt-3 text-sm text-paper/70">{plate.line}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-orange/90">
                        берут с {plate.since}
                      </p>
                    </button>
                    <div
                      id={slotId}
                      className="grid transition-[grid-template-rows] duration-200 ease-linear"
                      style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
                    >
                      <div
                        className="overflow-hidden"
                        {...(!expanded ? { inert: true, "aria-hidden": true } : {})}
                      >
                        <blockquote className="border-t border-orange/40 px-5 py-4">
                          <p className="text-sm text-paper/80">«{plate.text}»</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-orange">
                            {plate.fact}
                          </p>
                        </blockquote>
                      </div>
                    </div>
                  </motion.div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-8 overflow-hidden" aria-hidden>
          <div
            className={cn(
              "flex w-max whitespace-nowrap text-[11px] uppercase tracking-[0.28em] text-white/25",
              !reduce && "passage-stamp-marquee",
            )}
          >
            {[0, 1].map((copy) => (
              <p key={copy} className="flex items-center gap-10 pr-10">
                {passageStamps.map((stamp) => (
                  <span key={`${copy}-${stamp.label}`}>{stamp.label}</span>
                ))}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
