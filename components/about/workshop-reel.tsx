"use client";

import { useCallback, useRef, useState, type MouseEvent } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

const SRC = "/about/workshop.mp4";
const POSTER = "/about/workshop-poster.jpg";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function WorkshopReel({
  className,
  variant = "portrait",
}: {
  className?: string;
  variant?: "portrait" | "cinema";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(13);
  const [current, setCurrent] = useState(0);

  const idle = !playing;

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      if (video.ended) video.currentTime = 0;
      void video.play();
      return;
    }
    video.pause();
  }, []);

  const toggleMute = useCallback((event: MouseEvent) => {
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const cinema = variant === "cinema";

  return (
    <figure
      className={cn(
        "relative w-full",
        cinema ? "h-full max-w-none" : "mx-auto max-w-[22rem]",
        className,
      )}
    >
      {cinema ? null : (
        <div
          aria-hidden
          className="absolute -inset-8 rounded-[2.75rem] bg-[radial-gradient(ellipse_at_center,rgb(249_115_22_/_0.32),transparent_68%)] blur-2xl"
        />
      )}
      <div
        className={cn(
          "relative overflow-hidden bg-navy",
          cinema
            ? "h-full min-h-[22rem] sm:min-h-[28rem] lg:min-h-full"
            : "aspect-[3/4] rounded-[1.75rem] shadow-[0_28px_60px_-24px_rgb(4_0_64_/_0.7)] ring-1 ring-white/15",
        )}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          poster={POSTER}
          preload="metadata"
          playsInline
          onClick={togglePlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setProgress(1);
          }}
          onLoadedMetadata={(event) => {
            const next = event.currentTarget.duration;
            if (Number.isFinite(next) && next > 0) setDuration(next);
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            setCurrent(video.currentTime);
            if (video.duration > 0) {
              setProgress(video.currentTime / video.duration);
            }
          }}
        >
          <source src={SRC} type="video/mp4" />
        </video>

        <div className="home-grain pointer-events-none absolute inset-0 opacity-25" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(4_0_64_/_0.58)_0%,transparent_20%,transparent_52%,rgb(4_0_64_/_0.88)_100%)]" />

        <div className="pointer-events-none absolute top-0 right-0 left-0 flex items-center justify-between px-4 pt-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-black/35 px-2.5 py-1 text-[10px] tracking-[0.18em] text-white/85 uppercase backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-orange motion-safe:animate-pulse" />
            С площадки
          </span>
          <span className="text-[10px] tracking-[0.18em] text-white/55 uppercase">
            {formatTime(duration)}
          </span>
        </div>

        {idle ? (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3 text-white"
            aria-label="Смотреть ролик с производства"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-orange text-white shadow-[0_12px_32px_rgb(249_115_22_/_0.45)] ring-1 ring-white/25 transition-transform duration-300 hover:scale-105">
              <Play className="ml-0.5 size-7 fill-current" />
            </span>
            <span className="text-[11px] tracking-[0.22em] text-white/80 uppercase">
              Смотреть цех
            </span>
          </button>
        ) : (
          <div className="absolute right-0 bottom-0 left-0 z-[1] flex items-end justify-between px-4 pb-4">
            <button
              type="button"
              onClick={togglePlay}
              className="flex size-9 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/15 backdrop-blur-sm"
              aria-label="Пауза"
            >
              <Pause className="size-4 fill-current" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] tabular-nums text-white/70">
                {formatTime(current)}
              </span>
              <button
                type="button"
                onClick={toggleMute}
                className="flex size-9 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/15 backdrop-blur-sm"
                aria-label={muted ? "Включить звук" : "Выключить звук"}
              >
                {muted ? (
                  <VolumeX className="size-4" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </button>
            </div>
          </div>
        )}

        <div
          className="pointer-events-none absolute right-0 bottom-0 left-0 h-1 bg-white/15"
          aria-hidden
        >
          <span
            className="block h-full bg-orange"
            style={{ width: `${Math.min(progress, 1) * 100}%` }}
          />
        </div>
      </div>
      {cinema ? null : (
        <figcaption className="relative mt-3 text-center text-xs text-steel">
          {brand.address} · 13 сек с линии вязки
        </figcaption>
      )}
    </figure>
  );
}
