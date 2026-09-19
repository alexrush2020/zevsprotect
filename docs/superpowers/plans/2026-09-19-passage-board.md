# Passage Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage «Отзывы закупщиков» cards with a factory hallway honor board: three metal plates, a slot under the open plate, faded background stamps.

**Architecture:** Pure helpers decide which plate is open and whether hover may open it. Catalog data gains plate fields and eight stamps. A client `PassageBoard` owns the dark wall, watermark, rail, plates, and slot. `home-view.tsx` swaps the old section for that component.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, motion/react, Vitest (node) for helper and data tests. Visual check in the browser on port 43127.

## Global Constraints

- Copy and chrome from `docs/superpowers/specs/2026-09-19-passage-board-design.md` — verbatim labels, years, facts, stamps.
- Do not mention the factory founding year (2005).
- No stars, avatars, partner logos, faces, photo backgrounds, carousel, autoplay, swipe, or «оставить отзыв» / «встать на доску».
- Hover opens only when `(hover: hover) and (pointer: fine)`. Touch uses tap only. Do not use viewport width for this.
- One open plate at a time. Slot opens under the plate, not beside it.
- Section sits on the homepage between «Условия покупки» / «Персональные условия» and «Статьи». Other routes stay untouched.
- Years on plates are prototype numbers, not contract dates.
- Dark grain aesthetic: `bg-ink`, `text-paper`, `home-grain`, orange accent.
- Reply and UI copy in Russian.

## File map

| File | Role |
|---|---|
| `lib/types.ts` | `PassagePlate` and `PassageStamp` types |
| `lib/passage-board.ts` | `nextOpenPlate`, `canHoverOpenPlate` |
| `lib/passage-board.test.ts` | Helper tests |
| `lib/data/catalog.ts` | `reviews` and `passageStamps` data |
| `lib/data/catalog-passage.test.ts` | Data-shape tests |
| `vitest.config.ts` | Node test runner + `@/` alias |
| `package.json` | `test` script + vitest devDependency |
| `components/home/passage-board.tsx` | Wall, rail, plates, slot |
| `components/home/home-view.tsx` | Drop old cards, mount `<PassageBoard />` |

---

### Task 1: Plate helpers and Vitest

**Files:**
- Create: `lib/passage-board.ts`
- Create: `lib/passage-board.test.ts`
- Create: `vitest.config.ts`
- Modify: `lib/types.ts` (append types at end of file)
- Modify: `package.json` (`scripts.test`, `devDependencies.vitest`)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type PassagePlate = { company: string; city?: string; line: string; since: number; text: string; fact: string }`
  - `type PassageStamp = { label: string; redacted: boolean }`
  - `function nextOpenPlate(open: number \| null, index: number): number \| null`
  - `function canHoverOpenPlate(hover: boolean, pointerFine: boolean): boolean`

- [ ] **Step 1: Append types to `lib/types.ts`**

Add at the end of the file:

```ts
export type PassagePlate = {
  company: string;
  city?: string;
  line: string;
  since: number;
  text: string;
  fact: string;
};

export type PassageStamp = {
  label: string;
  redacted: boolean;
};
```

- [ ] **Step 2: Write the failing helper tests**

Create `lib/passage-board.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canHoverOpenPlate, nextOpenPlate } from "@/lib/passage-board";

describe("nextOpenPlate", () => {
  it("opens a closed board on the pressed index", () => {
    expect(nextOpenPlate(null, 1)).toBe(1);
  });

  it("closes the same plate", () => {
    expect(nextOpenPlate(2, 2)).toBe(null);
  });

  it("switches to another plate", () => {
    expect(nextOpenPlate(0, 2)).toBe(2);
  });
});

describe("canHoverOpenPlate", () => {
  it("allows hover only when hover exists and the pointer is fine", () => {
    expect(canHoverOpenPlate(true, true)).toBe(true);
    expect(canHoverOpenPlate(true, false)).toBe(false);
    expect(canHoverOpenPlate(false, true)).toBe(false);
    expect(canHoverOpenPlate(false, false)).toBe(false);
  });
});
```

- [ ] **Step 3: Add Vitest config and script**

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
```

In `package.json` add `"test": "vitest run"` to `scripts` and `"vitest": "^3.2.4"` to `devDependencies`.

Run: `npm install`

Expected: vitest appears in `node_modules`, lockfile updates.

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -- lib/passage-board.test.ts`

Expected: FAIL — `Cannot find module '@/lib/passage-board'` or `nextOpenPlate is not defined`.

- [ ] **Step 5: Write minimal helpers**

Create `lib/passage-board.ts`:

```ts
export function nextOpenPlate(open: number | null, index: number): number | null {
  return open === index ? null : index;
}

export function canHoverOpenPlate(hover: boolean, pointerFine: boolean): boolean {
  return hover && pointerFine;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- lib/passage-board.test.ts`

Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/passage-board.ts lib/passage-board.test.ts vitest.config.ts package.json package-lock.json
git commit -m "Добавить правила открытия табличек доски, чтобы паз жил в одном индексе."
```

---

### Task 2: Catalog plates and stamps

**Files:**
- Modify: `lib/data/catalog.ts:801-814` (`reviews`) and append `passageStamps` after `reviews`
- Create: `lib/data/catalog-passage.test.ts`

**Interfaces:**
- Consumes: `PassagePlate`, `PassageStamp` from `@/lib/types`
- Produces:
  - `export const reviews: PassagePlate[]` — exactly three plates
  - `export const passageStamps: PassageStamp[]` — exactly eight stamps

- [ ] **Step 1: Write the failing data tests**

Create `lib/data/catalog-passage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { passageStamps, reviews } from "@/lib/data/catalog";

describe("reviews", () => {
  it("has three hallway plates with split city and prototype years", () => {
    expect(reviews).toHaveLength(3);
    expect(reviews.map((r) => r.company)).toEqual([
      "ООО «Анод»",
      "ГК «Ланмар»",
      "ООО «Арсеналтрейдинг»",
    ]);
    expect(reviews[0]).toMatchObject({
      line: "стабильность партий",
      since: 2019,
      fact: "расхождения — в тот же день",
      text: "Стабильность поставок и качество партий. Менеджеры решают расхождения по артикулам в тот же день, без «перезвоним».",
    });
    expect(reviews[0].city).toBeUndefined();
    expect(reviews[1]).toMatchObject({
      line: "ХБ · спилок · нитрил · КЩС",
      since: 2021,
      fact: "логотип · цена держится",
      text: "Берём ХБ, спилок, нитрил и КЩС. Можно нанести логотип, цена держится при регулярном объёме.",
    });
    expect(reviews[2]).toMatchObject({
      city: "Краснодар",
      line: "отгрузка вовремя",
      since: 2020,
      fact: "по срочным говорят сразу",
      text: "Ассортимент широкий, отгрузка вовремя. Важно, что по срочным заказам сразу говорят, реально это или нет.",
    });
  });
});

describe("passageStamps", () => {
  it("has four live names and four redacted marks", () => {
    expect(passageStamps).toHaveLength(8);
    expect(passageStamps.filter((s) => !s.redacted).map((s) => s.label)).toEqual([
      "Севстальснаб",
      "Югметалл",
      "Донтехмонтаж",
      "Прибой",
    ]);
    expect(passageStamps.filter((s) => s.redacted).map((s) => s.label)).toEqual([
      "——————",
      "—— · ——",
      "**** ****",
      "······",
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/data/catalog-passage.test.ts`

Expected: FAIL — `reviews[0].line` undefined and/or `passageStamps is not defined`.

- [ ] **Step 3: Replace `reviews` and add `passageStamps`**

In `lib/data/catalog.ts` add this import at the top with the existing type imports (file already imports `Article`, `Product`, `CategorySlug` from `@/lib/types` — add `PassagePlate` and `PassageStamp` to that import).

Replace the current `reviews` block (`company` + `text` only, third company includes `, Краснодар`) with:

```ts
export const reviews: PassagePlate[] = [
  {
    company: "ООО «Анод»",
    line: "стабильность партий",
    since: 2019,
    text: "Стабильность поставок и качество партий. Менеджеры решают расхождения по артикулам в тот же день, без «перезвоним».",
    fact: "расхождения — в тот же день",
  },
  {
    company: "ГК «Ланмар»",
    line: "ХБ · спилок · нитрил · КЩС",
    since: 2021,
    text: "Берём ХБ, спилок, нитрил и КЩС. Можно нанести логотип, цена держится при регулярном объёме.",
    fact: "логотип · цена держится",
  },
  {
    company: "ООО «Арсеналтрейдинг»",
    city: "Краснодар",
    line: "отгрузка вовремя",
    since: 2020,
    text: "Ассортимент широкий, отгрузка вовремя. Важно, что по срочным заказам сразу говорят, реально это или нет.",
    fact: "по срочным говорят сразу",
  },
];

export const passageStamps: PassageStamp[] = [
  { label: "Севстальснаб", redacted: false },
  { label: "Югметалл", redacted: false },
  { label: "Донтехмонтаж", redacted: false },
  { label: "Прибой", redacted: false },
  { label: "——————", redacted: true },
  { label: "—— · ——", redacted: true },
  { label: "**** ****", redacted: true },
  { label: "······", redacted: true },
];
```

If `home-view.tsx` still reads `{r.text}` / `{r.company}` at this moment, TypeScript still compiles: those fields remain. The old third `company` string no longer contains the city — that is intended; Task 4 removes that markup.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/data/catalog-passage.test.ts`

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/data/catalog.ts lib/data/catalog-passage.test.ts
git commit -m "Наполнить доску именами и клеймами, чтобы стена читалась без цитат."
```

---

### Task 3: `PassageBoard` wall

**Files:**
- Create: `components/home/passage-board.tsx`

**Interfaces:**
- Consumes: `reviews`, `passageStamps`; `nextOpenPlate`, `canHoverOpenPlate`; `Reveal` from `@/components/home/motion`; `useReducedMotion` from `motion/react`
- Produces: `export function PassageBoard(): JSX.Element`

- [ ] **Step 1: Create the client board**

Create `components/home/passage-board.tsx` with this exact component. Do not add stars, logos, faces, a CTA button, or a carousel.

```tsx
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
    if (hoverOpens && focused !== index) setOpen(null);
  }

  function press(index: number) {
    if (hoverOpens) return;
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

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-6 flex-wrap justify-center gap-x-10 gap-y-3 px-8 text-[11px] uppercase tracking-[0.28em] text-white/10"
      >
        {passageStamps.map((stamp) => (
          <span key={stamp.label} className={stamp.redacted ? "text-white/5" : undefined}>
            {stamp.label}
          </span>
        ))}
      </div>

      <div className="relative mx-auto max-w-6xl px-4">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.22em] text-orange">
            Доска в проходной
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
                <li key={plate.company}>
                  <motion.div
                    className={cn(
                      "relative rounded-sm border bg-[#0b0b18] transition-opacity duration-200",
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
                      <div className="overflow-hidden">
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

        <p className="mt-8 text-center text-xs uppercase tracking-[0.22em] text-white/35">
          Остальные не вывешиваем
        </p>
      </div>
    </section>
  );
}
```

Note on `canHoverOpenPlate(fineHover, fineHover)`: `useFineHover` already ANDs `(hover: hover) and (pointer: fine)` in one media query, so both arguments are that match. The helper still documents the spec rule and stays unit-tested.

Keyboard: Enter/Space always toggle through `onKeyDown` + `preventDefault` so a mouse click on a fine-pointer hover does not immediately close an already-open plate. Touch uses `press` → `nextOpenPlate`.

- [ ] **Step 2: Typecheck the new file**

Run: `npx tsc --noEmit --pretty false`

Expected: no errors from `passage-board.tsx`. If `home-view.tsx` still maps old review cards, it must still typecheck because `company` and `text` remain on `PassagePlate`.

- [ ] **Step 3: Commit**

```bash
git add components/home/passage-board.tsx
git commit -m "Собрать доску в проходной, чтобы отзывы висели табличками, а не карточками."
```

---

### Task 4: Mount the board on the homepage

**Files:**
- Modify: `components/home/home-view.tsx:14` (imports)
- Modify: `components/home/home-view.tsx:257-274` (reviews section)

**Interfaces:**
- Consumes: `PassageBoard` from `@/components/home/passage-board`
- Produces: homepage renders the board; `reviews` is no longer imported in `home-view.tsx`

- [ ] **Step 1: Swap the section**

In the import from `@/lib/data/catalog`, remove `reviews`:

```ts
import { articles, categories, products } from "@/lib/data/catalog";
```

Add:

```ts
import { PassageBoard } from "@/components/home/passage-board";
```

Replace the entire reviews section (the `max-w-6xl` block with heading «Отзывы закупщиков» and the three `blockquote` cards) with:

```tsx
      <PassageBoard />
```

Leave the following «Статьи» section and the «Нужен расчёт партии?» section unchanged.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit --pretty false`

Expected: clean. `reviews` unused import must be gone.

- [ ] **Step 3: Commit**

```bash
git add components/home/home-view.tsx
git commit -m "Поставить доску на главную вместо карточек отзывов закупщиков."
```

---

### Task 5: Browser verification

**Files:**
- None (manual + `npm test`)

**Interfaces:**
- Consumes: running app on `http://127.0.0.1:43127/`
- Produces: evidence that the spec checklist passes

- [ ] **Step 1: Unit tests still pass**

Run: `npm test`

Expected: PASS, 6 tests (4 helper + 2 catalog).

- [ ] **Step 2: Open the homepage**

If `next dev` is not already on port 43127, run `npx next dev --port 43127`. Open `http://127.0.0.1:43127/`.

Desktop (wide):

1. Wall reads at rest: ярлык `Доска в проходной`, заголовок `Кто берёт и не уходит`, watermark `ПРОХОДНАЯ`, three names, years `берут с 2019/2021/2020`, faded stamps, footer `Остальные не вывешиваем`. No quotes until hover.
2. Hover a plate: it drops ~12px, orange edge, slot **under** the plate with quote + fact. Neighbors dim. Only one open.
3. Leave the plate: slot closes unless that button still has focus.
4. Tab to plates, Enter/Space toggles `aria-expanded`.
5. «Статьи» and «Нужен расчёт партии?» still follow.

Mobile (narrow viewport, touch emulation):

1. Hover does not open. Tap opens, tap again or tap another plate closes the previous. No swipe carousel.

Reduced motion: enable the OS/browser setting, reload. Slot still opens; plate does not travel on Y.

- [ ] **Step 3: Fix if any check fails, then re-run that check**

Do not mark the feature done until the six spec checks pass.

No extra commit unless a fix was required. If a fix was required, commit only the files that changed, with a message that states why.

---

## Spec coverage

| Spec section | Task |
|---|---|
| Replace cards between purchase terms and articles | 4 |
| Dark wall, grain, `ПРОХОДНАЯ`, eyebrow, heading, no quotes at rest | 3 |
| Three heavy plates + eight background stamps, stamps not clickable | 2, 3 |
| Footer `Остальные не вывешиваем`, no CTA | 3 |
| Plate fields: company, city, line, `берут с` year | 2, 3 |
| Slot under plate: quote + fact, one open, neighbors dim | 1, 3 |
| Hover only on fine pointer; tap on touch; no swipe/autoplay | 1, 3 |
| Keyboard + `aria-expanded` | 3 |
| Reduced motion: slot without drop | 3 |
| Data shape + prototype years | 2 |
| Other routes untouched | 4, 5 |
| Browser checklist | 5 |
