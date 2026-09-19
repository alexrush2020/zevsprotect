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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/hero/glove-point-up.png"
      alt=""
      width={196}
      height={420}
      className="pointer-events-none h-[5.25rem] w-auto object-contain drop-shadow-[0_10px_18px_rgba(4,0,64,0.32)] sm:h-[6.75rem]"
    />
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
          className="glove-up-btn fixed bottom-6 right-1.5 z-40 flex cursor-pointer flex-col items-center outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-orange sm:bottom-10 sm:right-4"
          initial={reduce ? { opacity: 1 } : { x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { x: 80, opacity: 0 }}
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
