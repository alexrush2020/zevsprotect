"use client";

import { useEffect, useRef, useState } from "react";

export function ReviewCardExcerpt({ text, href }: { text: string; href: string }) {
  const clampedRef = useRef<HTMLParagraphElement>(null);
  const fullRef = useRef<HTMLParagraphElement>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const clamped = clampedRef.current;
    const full = fullRef.current;
    if (!clamped || !full) return;
    const sync = () => {
      setTruncated(full.scrollHeight - clamped.clientHeight > 1);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(clamped);
    observer.observe(full);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div className="mt-3">
      <div className="relative">
        <p
          ref={clampedRef}
          className="line-clamp-3 min-h-[3lh] text-sm leading-relaxed text-steel"
        >
          {text}
        </p>
        <p
          ref={fullRef}
          aria-hidden
          className="pointer-events-none invisible absolute inset-x-0 top-0 text-sm leading-relaxed"
        >
          {text}
        </p>
      </div>
      <div className="mt-2 h-5">
        {truncated ? (
          <a
            href={href}
            className="text-xs font-semibold text-orange transition hover:underline"
          >
            Прочитать полностью
          </a>
        ) : null}
      </div>
    </div>
  );
}
