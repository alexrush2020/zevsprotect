import { describe, expect, it } from "vitest";
import { buildSpecFilters, products, specFilters } from "./catalog";

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
