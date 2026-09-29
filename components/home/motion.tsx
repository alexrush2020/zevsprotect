"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { cn } from "@/lib/utils";

export const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function Reveal({
  children,
  className,
  delay = 0,
  y = 36,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.85, delay, ease: easeOutExpo }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? "visible" : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.08, delayChildren: delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={cn("relative z-[1] h-full hover:z-30", className)}
      variants={{
        hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
        visible: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.7, ease: easeOutExpo },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({
  to,
  suffix = "",
  prefix = "",
  duration = 1.6,
  ease = "out",
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  ease?: "out" | "linear";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const [value, setValue] = useState(reduce ? to : 0);

  useEffect(() => {
    if (reduce || !inView) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = ease === "linear" ? t : 1 - (1 - t) ** 3;
      setValue(Math.round(to * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduce, to, duration, ease]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {(reduce ? to : value).toLocaleString("ru-RU")}
      {suffix}
    </span>
  );
}

export function Tilt({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 18, mass: 0.4 });
  const sry = useSpring(ry, { stiffness: 180, damping: 18, mass: 0.4 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    const px = (e.clientX - box.left) / box.width - 0.5;
    const py = (e.clientY - box.top) / box.height - 0.5;
    ry.set(px * 10);
    rx.set(-py * 10);
  }

  return (
    <motion.div
      ref={ref}
      className={cn("will-change-transform", className)}
      style={{
        rotateX: srx,
        rotateY: sry,
        transformPerspective: 900,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={onMove}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export function Magnetic({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 240, damping: 16 });
  const sy = useSpring(y, { stiffness: 240, damping: 16 });
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        if (reduce || !ref.current) return;
        const box = ref.current.getBoundingClientRect();
        x.set((e.clientX - box.left - box.width / 2) * 0.28);
        y.set((e.clientY - box.top - box.height / 2) * 0.28);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
