"use client";

import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";

function WorkGlove() {
  return (
    <svg
      viewBox="0 0 100 148"
      className="h-[4.35rem] w-[2.95rem] drop-shadow-[0_10px_18px_rgba(4,0,64,0.32)] sm:h-[5.75rem] sm:w-[3.9rem]"
      aria-hidden
    >
      <defs>
        <linearGradient id="glove-knit" x1="20" y1="4" x2="90" y2="140">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="55%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="140" rx="26" ry="5" fill="#040040" opacity="0.22" />
      <g fill="url(#glove-knit)" stroke="#9a3412" strokeWidth="1.6" strokeLinejoin="round">
        <rect x="21" y="22" width="14" height="50" rx="7" />
        <rect x="36" y="8" width="15" height="60" rx="7.5" />
        <rect x="52" y="12" width="15" height="56" rx="7.5" />
        <rect x="68" y="24" width="14" height="48" rx="7" />
        <rect x="19" y="54" width="66" height="62" rx="22" />
        <g transform="rotate(-42 26 84)">
          <rect x="2" y="62" width="18" height="42" rx="9" />
        </g>
      </g>
      <g fill="#7c2d12" opacity="0.32">
        <circle cx="36" cy="78" r="2.2" />
        <circle cx="50" cy="74" r="2.2" />
        <circle cx="64" cy="78" r="2.2" />
        <circle cx="43" cy="90" r="2.2" />
        <circle cx="58" cy="90" r="2.2" />
        <circle cx="50" cy="102" r="2.2" />
      </g>
      <path
        d="M43 20v86M58 18v88"
        stroke="#fff7ed"
        strokeOpacity="0.28"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <rect x="32" y="112" width="36" height="22" rx="8" fill="#171717" />
      <rect x="36" y="116" width="28" height="4" rx="2" fill="#52525b" />
      <rect x="36" y="123" width="28" height="4" rx="2" fill="#52525b" />
    </svg>
  );
}

export function BackToTopGlove() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    setVisible(y > 420);
  });

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          data-print-hide
          aria-label="Наверх"
          onClick={() =>
            window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
          }
          className="glove-up-btn fixed bottom-24 left-1.5 z-40 flex cursor-pointer flex-col items-center outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-orange sm:bottom-10 sm:left-4"
          initial={reduce ? { opacity: 1 } : { x: -80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { x: -80, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className={reduce ? undefined : "glove-up-float"}>
            <WorkGlove />
          </span>
          <span className="rounded-full bg-orange px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-white shadow-sm sm:text-[10px]">
            Вверх
          </span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
