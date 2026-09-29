"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";

const GLYPHS = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЫЭЮЯABCDEFGHJKLMNPRSTWXYZ0123456789#$%";

function scrambleChar() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "А";
}

function useFlapLine(target: string, active: boolean, delayMs: number) {
  const reduce = useReducedMotion();
  const [text, setText] = useState(() => (reduce ? target : target.replace(/[^\s]/g, "·")));

  useEffect(() => {
    if (reduce || !active) return;

    const chars = [...target];
    const settleAt = chars.map((ch, i) =>
      ch === " " ? delayMs : delayMs + 280 + i * 32 + Math.floor(Math.random() * 90),
    );
    const started = performance.now();
    const id = window.setInterval(() => {
      const elapsed = performance.now() - started;
      let done = true;
      const next = chars.map((ch, i) => {
        if (ch === " ") return " ";
        if (elapsed >= settleAt[i]) return ch;
        done = false;
        return scrambleChar();
      });
      setText(next.join(""));
      if (done) window.clearInterval(id);
    }, 42);

    return () => window.clearInterval(id);
  }, [active, delayMs, reduce, target]);

  return reduce ? target : text;
}

function FlapRow({
  title,
  detail,
  active,
  delayMs,
}: {
  title: string;
  detail: string;
  active: boolean;
  delayMs: number;
}) {
  const line = useFlapLine(title.toUpperCase(), active, delayMs);

  return (
    <Link
      href="/delivery"
      className="group flex min-h-0 flex-1 flex-col justify-center bg-white/[0.06] px-4 py-2.5 ring-1 ring-white/10 transition-colors hover:bg-white/12 hover:ring-orange/40"
    >
      <div className="relative flex items-center justify-between gap-4">
        <p className="geo-flap-line min-w-0 font-heading text-[15px] tracking-[0.16em] text-white uppercase sm:text-[17px]">
          {line}
        </p>
        <ArrowRight className="size-4 shrink-0 text-white/35 transition-transform group-hover:translate-x-0.5 group-hover:text-orange" />
      </div>
      <p className="mt-1 text-[11px] leading-snug text-white/45">{detail}</p>
    </Link>
  );
}

export function GeoBoard({
  rows,
}: {
  rows: readonly (readonly [string, string])[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });

  return (
    <div ref={ref} className="flex h-full min-h-[22rem] flex-col gap-px bg-navy lg:min-h-full">
      {rows.map(([title, detail], i) => (
        <FlapRow
          key={title}
          title={title}
          detail={detail}
          active={inView}
          delayMs={i * 130}
        />
      ))}
    </div>
  );
}
