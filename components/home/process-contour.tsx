"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const steps = [
  ["Сырьё", "Пряжа, спилок, компаунды — входной контроль до вязки."],
  ["Вязка", "Класс, плотность и размер сверяются с картой модели."],
  ["Покрытие", "Толщина и рисунок облива — на партии, не «на глаз»."],
  ["Отгрузка", "Комплектация, сертификаты и фура с одной площадки."],
] as const;

const FUSE_S = 0.57;
const SPARK_PAUSE = 520;

const SPARK_COLORS = [
  "#FFF8E1",
  "#FFE9A0",
  "#F6E4A4",
  "#E4C56A",
  "#FFD36A",
  "#FFBE4A",
  "#FFF1C2",
  "#FFFFFF",
];

function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shardPoints(kind: number, w: number, h: number) {
  if (kind < 0.22) {
    return `0,${w * 0.15} ${h},0 0,-${w * 0.15}`;
  }
  if (kind < 0.44) {
    return `${-w * 0.4},${h * 0.1} ${w * 0.2},${-w * 0.5} ${h},${w * 0.05} ${w * 0.1},${w * 0.45}`;
  }
  if (kind < 0.66) {
    return `${-w * 0.2},${w * 0.35} ${w * 0.5},${-w * 0.4} ${h * 0.55},${-w * 0.15} ${h},${w * 0.2} ${w * 0.15},${w * 0.55}`;
  }
  if (kind < 0.84) {
    return `0,${w * 0.45} ${h * 0.35},${-w * 0.25} ${h},${0} ${h * 0.4},${w * 0.35}`;
  }
  return `${-w * 0.15},0 ${w * 0.35},${-w * 0.55} ${h * 0.7},${-w * 0.1} ${h},${w * 0.25} ${w * 0.2},${w * 0.5}`;
}

function makeWelderSparks(count: number, seed: number) {
  return Array.from({ length: count }, (_, i) => {
    const r = rng(seed + i * 97);
    const angle = (i / count) * Math.PI * 2 + (r() - 0.5) * 0.55;
    const dist = 26 + r() * 58;
    const w = 1.2 + r() * 3.4;
    const h = 7 + r() * 22;
    const rotate = (angle * 180) / Math.PI;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      rotate,
      spin: (r() - 0.5) * 48,
      delay: r() * 0.08,
      duration: 0.42 + r() * 0.38,
      color: SPARK_COLORS[Math.floor(r() * SPARK_COLORS.length)],
      points: shardPoints(r(), w, h),
      glow: 4 + r() * 8,
    };
  });
}

export function ProcessContour({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.42 });
  const [wide, setWide] = useState<boolean | null>(null);
  const [lit, setLit] = useState(0);
  const [fuse, setFuse] = useState(-1);
  const [spark, setSpark] = useState(-1);
  const [playKey, setPlayKey] = useState(0);
  const runId = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (wide === null) return;

    if (!inView) {
      runId.current += 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- анимация синхронизируется с видимостью секции
      setLit(0);
      setFuse(-1);
      setSpark(-1);
      return;
    }

    const id = ++runId.current;
    setPlayKey(id);
    if (reduce) {
      setLit(4);
      return;
    }

    setSpark(0);
    setLit(1);
    const t = window.setTimeout(() => {
      if (runId.current !== id) return;
      setSpark(-1);
      setFuse(0);
    }, SPARK_PAUSE + 80);
    return () => window.clearTimeout(t);
  }, [inView, wide, reduce]);

  function onFuseDone(index: number) {
    const id = runId.current;
    const nextNode = index + 1;
    setFuse(-1);
    setSpark(nextNode);
    setLit(nextNode + 1);
    window.setTimeout(() => {
      if (runId.current !== id) return;
      setSpark(-1);
      if (index < steps.length - 2) setFuse(index + 1);
    }, SPARK_PAUSE);
  }

  return (
    <div ref={ref} className={cn("mt-16", className)}>
      <p className="text-center text-xs uppercase tracking-[0.22em] text-orange">
        Производственный контур
      </p>
      <ol key={playKey} className="mt-8 grid gap-10 md:grid-cols-4 md:gap-6">
        {steps.map(([title, text], i) => (
          <li key={title} className="relative">
            <div className="relative flex items-center md:justify-center">
              <ProcessNode index={i} lit={lit > i} sparking={spark === i} />
            </div>
            {i < steps.length - 1 && wide !== null ? (
              <Fuse
                className={
                  wide
                    ? "absolute left-[calc(50%+1.5rem)] top-[23px] h-[2px] w-[calc(100%-1.5rem)]"
                    : "absolute left-[23px] top-12 h-10 w-px"
                }
                vertical={!wide}
                play={fuse === i}
                done={lit > i + 1}
                onDone={() => onFuseDone(i)}
              />
            ) : null}
            <h3 className="mt-4 font-heading text-lg md:text-center">{title}</h3>
            <p className="mt-2 text-sm text-steel md:text-center">{text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ProcessNode({
  index,
  lit,
  sparking,
}: {
  index: number;
  lit: boolean;
  sparking: boolean;
}) {
  return (
    <span className="relative z-10 flex size-12 shrink-0 items-center justify-center">
      {sparking ? <SparkBurst seed={index * 131 + 7} /> : null}
      <motion.span
        className={cn(
          "relative flex size-12 items-center justify-center rounded-full border-2 font-heading text-sm",
          lit
            ? "border-[#E4C56A] bg-navy text-[#F6E4A4]"
            : "border-navy bg-paper text-navy"
        )}
        animate={
          lit
            ? {
                boxShadow: sparking
                  ? "0 0 18px 6px rgba(255,232,150,0.7), 0 0 4px 1px rgba(255,255,255,0.85)"
                  : "0 0 0 1px rgba(228,197,106,0.55), 0 0 10px rgba(228,197,106,0.28)",
              }
            : { boxShadow: "0 0 0 0 rgba(228,197,106,0)" }
        }
        transition={{ duration: 0.28 }}
      >
        {String(index + 1).padStart(2, "0")}
      </motion.span>
    </span>
  );
}

function SparkBurst({ seed }: { seed: number }) {
  const sparks = useMemo(() => makeWelderSparks(56, seed), [seed]);

  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2 z-20">
      {sparks.map((s, i) => (
        <motion.svg
          key={i}
          width="32"
          height="32"
          viewBox="-16 -16 32 32"
          className="absolute"
          style={{ left: -16, top: -16, originX: 0.5, originY: 0.5 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: s.rotate, scale: 0.25 }}
          animate={{
            x: s.x,
            y: s.y,
            opacity: 0,
            rotate: s.rotate + s.spin,
            scale: 1,
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            ease: [0.12, 0.7, 0.2, 1],
          }}
        >
          <polygon
            points={s.points}
            fill={s.color}
            stroke="#040040"
            strokeOpacity={0.45}
            strokeWidth={0.95}
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 ${s.glow}px ${s.color})` }}
          />
        </motion.svg>
      ))}
    </span>
  );
}

function Fuse({
  play,
  done,
  onDone,
  vertical,
  className,
}: {
  play: boolean;
  done: boolean;
  onDone: () => void;
  vertical?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const finished = done && !play;
  const locked = useRef(false);

  useEffect(() => {
    if (play) locked.current = false;
  }, [play]);

  function complete() {
    if (!play || locked.current) return;
    locked.current = true;
    onDone();
  }

  if (vertical) {
    return (
      <div className={cn("overflow-visible", className)} aria-hidden>
        <span className="absolute inset-0 bg-navy/20" />
        <motion.span
          className="absolute left-0 top-0 h-full w-full origin-top bg-gradient-to-b from-[#8A6A18] via-[#E4C56A] to-[#FFF1B8]"
          initial={{ scaleY: reduce || finished ? 1 : 0 }}
          animate={{ scaleY: play || finished || reduce ? 1 : 0 }}
          transition={{ duration: reduce || !play ? 0 : FUSE_S, ease: "linear" }}
          onAnimationComplete={complete}
        />
      </div>
    );
  }

  return (
    <div className={cn("overflow-visible", className)} aria-hidden>
      <span className="absolute inset-0 bg-navy/15" />
      <motion.span
        className="absolute inset-y-0 left-0 w-full origin-left bg-gradient-to-r from-[#8A6A18] via-[#E4C56A] to-[#FFF1B8]"
        initial={{ scaleX: reduce || finished ? 1 : 0 }}
        animate={{ scaleX: play || finished || reduce ? 1 : 0 }}
        transition={{ duration: reduce || !play ? 0 : FUSE_S, ease: "linear" }}
        onAnimationComplete={complete}
      />
    </div>
  );
}
