import { describe, expect, it, vi } from "vitest";
import { buildReview, createReviewReceiver, rememberReview, rememberedReviewIds, type ReviewDeps } from "./reviews";

const ok = { rating: 5, text: "  Хват держит, размер в норму ", authorName: "ООО «Анод»", tags: ["grip"], recommends: true, sizeLabel: "L" };

function deps(over: Partial<ReviewDeps> = {}) {
  let id = 0;
  return {
    findProduct: vi.fn(async (slug: string) => (slug === "feniks" ? { id: 11 } : null)),
    create: vi.fn(async () => ({ id: ++id })),
    ...over,
  } satisfies ReviewDeps;
}

describe("buildReview", () => {
  it("нормализует поля; approved всегда false, даже если прислан клиентом", () => {
    const r = buildReview({ ...ok, approved: true } as never);
    expect(r).toEqual({
      ok: true,
      data: { authorName: "ООО «Анод»", rating: 5, text: "Хват держит, размер в норму", sizeLabel: "L", tags: ["grip"], recommends: true, approved: false },
    });
  });

  it("неверный рейтинг — отказ", () => {
    for (const rating of [0, 6, 4.5, "5", undefined, NaN])
      expect(buildReview({ ...ok, rating })).toMatchObject({ ok: false, error: expect.stringContaining("оценку") });
  });

  it("пустой/длинный текст, чужие темы, длинные поля — отказ", () => {
    expect(buildReview({ ...ok, text: "   " }).ok).toBe(false);
    expect(buildReview({ ...ok, text: 42 }).ok).toBe(false);
    expect(buildReview({ ...ok, text: "x".repeat(2001) }).ok).toBe(false);
    expect(buildReview({ ...ok, tags: ["spam"] }).ok).toBe(false);
    expect(buildReview({ ...ok, authorName: "x".repeat(121) }).ok).toBe(false);
  });

  it("гость без имени — «Закупщик»", () => {
    expect(buildReview({ rating: 4, text: "Норм" })).toMatchObject({ ok: true, data: { authorName: "Закупщик" } });
  });
});

describe("createReviewReceiver", () => {
  const req = (over = {}) => ({ productSlug: "feniks", input: ok, ip: "1.1.1.1", now: 1_000_000, ...over });

  it("гость: пишет отзыв неодобренным, без customer", async () => {
    const d = deps();
    expect(await createReviewReceiver()(d, req())).toEqual({ ok: true, id: "1" });
    expect(d.create).toHaveBeenCalledWith(expect.objectContaining({ product: 11, approved: false, rating: 5 }));
    expect(d.create).toHaveBeenCalledWith(expect.not.objectContaining({ customer: expect.anything() }));
  });

  it("клиент: customer из сессии", async () => {
    const d = deps();
    await createReviewReceiver()(d, req({ customerId: 7 }));
    expect(d.create).toHaveBeenCalledWith(expect.objectContaining({ customer: 7, approved: false }));
  });

  it("товар не найден / не опубликован / кривой slug — отказ без записи", async () => {
    const d = deps();
    const receive = createReviewReceiver();
    expect(await receive(d, req({ productSlug: "draft-model" }))).toEqual({ ok: false, error: "Товар не найден" });
    expect(await receive(d, req({ productSlug: "../x" }))).toEqual({ ok: false, error: "Товар не найден" });
    expect(d.create).not.toHaveBeenCalled();
  });

  it("невалидный ввод — отказ без записи", async () => {
    const d = deps();
    expect((await createReviewReceiver()(d, req({ input: { ...ok, rating: 9 } }))).ok).toBe(false);
    expect(d.create).not.toHaveBeenCalled();
  });

  it("honeypot: ok без записи", async () => {
    const d = deps();
    expect(await createReviewReceiver()(d, req({ input: { ...ok, website: "http://spam" } }))).toEqual({ ok: true, id: "" });
    expect(d.findProduct).not.toHaveBeenCalled();
    expect(d.create).not.toHaveBeenCalled();
  });

  it("дедуп: повтор той же отправки — тот же результат, одна запись; после окна — новая", async () => {
    const d = deps();
    const receive = createReviewReceiver();
    const [a, b] = await Promise.all([receive(d, req()), receive(d, req())]);
    expect(a).toEqual(b);
    expect(d.create).toHaveBeenCalledTimes(1);
    await receive(d, req({ now: 1_000_000 + 61_000 }));
    expect(d.create).toHaveBeenCalledTimes(2);
  });

  it("rate limit по IP + товар", async () => {
    const d = deps();
    const receive = createReviewReceiver();
    for (let i = 0; i < 3; i++) expect((await receive(d, req({ input: { ...ok, text: `t${i}` } }))).ok).toBe(true);
    expect(await receive(d, req({ input: { ...ok, text: "t4" } }))).toMatchObject({ ok: false, error: expect.stringContaining("Слишком много") });
    expect((await receive(d, req({ ip: "2.2.2.2", input: { ...ok, text: "t4" } }))).ok).toBe(true);
  });

  it("сбой записи — ошибка; повтор не залипает в дедупе", async () => {
    const create = vi.fn().mockRejectedValueOnce(new Error("db")).mockResolvedValue({ id: 5 });
    const d = deps({ create, log: () => {} });
    const receive = createReviewReceiver();
    expect((await receive(d, req())).ok).toBe(false);
    expect(await receive(d, req())).toEqual({ ok: true, id: "5" });
  });
});

describe("cookie своих отзывов", () => {
  it("читаются только подписанные id; подделка отбрасывается", () => {
    let c = rememberReview(undefined, "12", "s");
    c = rememberReview(c, "15", "s");
    expect(rememberedReviewIds(c, "s")).toEqual([12, 15]);
    expect(rememberedReviewIds(`${c}~99.forged`, "s")).toEqual([12, 15]);
    expect(rememberedReviewIds(c, "other-secret")).toEqual([]);
    expect(rememberedReviewIds(c, "")).toEqual([]);
  });
});
