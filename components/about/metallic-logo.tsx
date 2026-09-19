"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";

type MetallicLogoProps = {
  className?: string;
  variant?: "en" | "ru";
  tone?: "chrome" | "navy";
};

function logoSrc(variant: "en" | "ru") {
  return variant === "ru" ? "/brand/logo-ru-navy.png" : "/brand/logo-en-navy.png";
}

function toLuminanceMask(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = pixels;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 12) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    } else {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas.toDataURL("image/png");
}

export function MetallicLogo({
  className,
  variant = "ru",
  tone = "chrome",
}: MetallicLogoProps) {
  const src = logoSrc(variant);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      const next = toLuminanceMask(image);
      if (next) setMaskUrl(next);
    };
    image.src = src;
  }, [src]);

  const mask = maskUrl
    ? ({
        WebkitMaskImage: `url("${maskUrl}")`,
        maskImage: `url("${maskUrl}")`,
        WebkitMaskSourceType: "luminance",
        maskMode: "luminance",
      } as CSSProperties)
    : undefined;

  return (
    <span className={cn("logo-metal", className)} data-tone={tone} data-ready={maskUrl ? "" : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={brand.markRu} className="logo-metal-base" />
      {maskUrl ? (
        <>
          <span className="logo-metal-foil" style={mask} aria-hidden />
          <span className="logo-metal-sheen" style={mask} aria-hidden />
        </>
      ) : null}
    </span>
  );
}
