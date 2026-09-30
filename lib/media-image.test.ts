import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MediaImage } from "@/components/media-image";

const html = (src: string) => renderToStaticMarkup(createElement(MediaImage, { src, alt: "Атлант", className: "size-24" }));

describe("MediaImage (QA-D2)", () => {
  it("товар без фото — заглушка того же размера, без <img src>", () => {
    const out = html("");
    expect(out).not.toContain("<img");
    expect(out).toContain('role="img"');
    expect(out).toContain('aria-label="Атлант"');
    expect(out).toContain("size-24");
  });

  it("с фото — обычный img без изменений", () => {
    expect(html("/api/media/file/a.png")).toContain('<img src="/api/media/file/a.png" alt="Атлант" class="size-24"/>');
  });
});
