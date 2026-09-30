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

  it("основа/покрытие/цвет/размер — только из товаров, эталонный порядок, чужие значения в конце", () => {
    const [p] = products;
    const mk = (base: string, sizes: string[]) => ({ ...p, base, sizes, coating: "Латекс", color: "Хаки" });
    const f = buildSpecFilters([mk("Арамид", ["XL", "L"]), mk("Неведомая", ["L"]), mk("Хлопок", ["M"])]);
    expect(f.base).toEqual(["Хлопок", "Арамид", "Неведомая"]);
    expect(f.size).toEqual(["M", "L", "XL"]);
    expect(f.coating).toEqual(["Латекс"]);
  });
});
