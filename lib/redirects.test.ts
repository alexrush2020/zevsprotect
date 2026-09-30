import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { redirects } from "./redirects";

const exists = (p: string) => existsSync(join(process.cwd(), "app/(frontend)", p, "page.tsx"));

describe("redirects", () => {
  it("нет дублей source", () => {
    const s = redirects.map((r) => r.source);
    expect(new Set(s).size).toBe(s.length);
  });
  it("нет цепочек и петель", () => {
    const sources = new Set(redirects.map((r) => r.source));
    for (const r of redirects) {
      expect(r.destination).not.toBe(r.source);
      expect(sources.has(r.destination)).toBe(false);
    }
  });
  it("destination — существующий статический маршрут", () => {
    for (const r of redirects) expect(exists(r.destination)).toBe(true);
  });
});
