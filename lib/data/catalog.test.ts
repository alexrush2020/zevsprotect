import { describe, expect, it } from "vitest";
import { buildSpecFilters, products, specFilters, withMockIds } from "./catalog";

describe("withMockIds", () => {
  it("id мока по slug, порядок мока, неизвестный товар — в конце со своим id", () => {
    const [a, b] = products;
    const fromPayload = [
      { ...b, id: "12" },
      { ...a, id: "3", slug: "novyi-iz-1s" },
      { ...a, id: "11" },
    ];
    expect(withMockIds(fromPayload).map((p) => p.id)).toEqual([a.id, b.id, "3"]);
  });

  it("деньги и упаковка — из мока, как в корзине; прочие поля — из Payload", () => {
    const [a] = products;
    const [r] = withMockIds([{ ...a, id: "7", name: "Из Payload", price: a.price + 5, minQty: 1, stock: 0 }]);
    expect([r.price, r.minQty, r.stock, r.name]).toEqual([a.price, a.minQty, a.stock, "Из Payload"]);
  });
});

describe("buildSpecFilters", () => {
  it("по списку товаров: уникальные значения по числу; на моке совпадает с specFilters", () => {
    const [p] = products;
    const f = buildSpecFilters([
      { ...p, tex: "20", length: undefined },
      { ...p, tex: "3,5", length: "24 см" },
      { ...p, tex: "20", length: undefined },
    ]);
    expect(f.tex).toEqual(["3,5", "20"]);
    expect(f.length).toEqual(["24 см"]);
    expect(buildSpecFilters(products)).toEqual(specFilters);
  });
});
