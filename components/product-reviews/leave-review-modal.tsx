"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { topicLabels, type ReviewTopic } from "@/lib/data/product-reviews";
import { submitUserReview } from "@/lib/reviews/review-store";
import { cn } from "@/lib/utils";

const topics = Object.keys(topicLabels) as ReviewTopic[];

export function LeaveReviewModal({
  open,
  onOpenChange,
  productSlug,
  productTitle,
  author,
  colorLabel,
  sizeLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productSlug: string;
  productTitle: string;
  author: string;
  colorLabel?: string;
  sizeLabel?: string;
}) {
  const [rating, setRating] = useState(5);
  const [company, setCompany] = useState(author);
  const [text, setText] = useState("");
  const [tags, setTags] = useState<ReviewTopic[]>(["quality"]);
  const [recommends, setRecommends] = useState(true);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRating(5);
    setCompany(author);
    setText("");
    setTags(["quality"]);
    setRecommends(true);
    setError("");
    setDone(false);
  }, [open, author]);

  function toggleTag(topic: ReviewTopic) {
    setTags((current) =>
      current.includes(topic)
        ? current.filter((item) => item !== topic)
        : [...current, topic],
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!text.trim()) {
      setError("Напишите несколько слов о партии или модели.");
      return;
    }
    if (tags.length === 0) {
      setError("Выберите хотя бы одну тему отзыва.");
      return;
    }
    submitUserReview({
      productSlug,
      productTitle,
      author: company,
      rating,
      text,
      tags,
      recommends,
      colorLabel,
      sizeLabel,
    });
    setDone(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {done ? (
          <div className="py-4 text-center">
            <DialogHeader>
              <DialogTitle className="text-xl">Спасибо за отзыв!</DialogTitle>
              <DialogDescription>
                Отзыв отправлен на модерацию и появится на странице товара после
                проверки. В прототипе он уже виден локально.
              </DialogDescription>
            </DialogHeader>
            <Button className="mt-5 h-10" onClick={() => onOpenChange(false)}>
              Закрыть
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-steel">
                Отзыв о товаре
              </p>
              <DialogTitle className="pr-8 text-xl">{productTitle}</DialogTitle>
              <DialogDescription>
                Оценка закупщика по партии: качество, хват, размер и сроки.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5">
              <p className="text-xs font-medium">Оценка</p>
              <div className="mt-2 flex gap-1" role="group" aria-label="Оценка от 1 до 5">
                {Array.from({ length: 5 }, (_, i) => {
                  const value = i + 1;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className={cn(
                        "grid h-10 w-10 place-items-center rounded-lg border transition",
                        value <= rating
                          ? "border-orange bg-orange/15 text-orange"
                          : "border-border text-border hover:border-orange/50",
                      )}
                      aria-label={`${value} из 5`}
                      aria-pressed={value <= rating}
                    >
                      <svg viewBox="0 0 12 12" className="h-4 w-4" fill="currentColor" aria-hidden>
                        <path d="M6 1l1.5 3.5H11L8.2 7l1.1 3.5L6 8.5 2.7 10.5 3.8 7 1 4.5h3.5z" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-1.5">
              <Label htmlFor="review-company">Компания</Label>
              <Input
                id="review-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="ООО «…»"
              />
            </div>

            <div className="mt-4 grid gap-1.5">
              <Label htmlFor="review-text">Комментарий</Label>
              <Textarea
                id="review-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Расскажите о партии, хвате, размере и сроках отгрузки…"
              />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium">О чём отзыв</p>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => {
                  const active = tags.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTag(topic)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        active
                          ? "border-orange bg-orange/10 text-orange"
                          : "border-border text-steel hover:border-orange/50",
                      )}
                    >
                      {topicLabels[topic]}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={recommends}
                onChange={(e) => setRecommends(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-orange"
              />
              Рекомендую эту модель для повторных партий
            </label>

            {error ? (
              <p className="mt-3 text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="submit" className="h-10">
                Отправить отзыв
              </Button>
              <Button type="button" variant="outline" className="h-10" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
