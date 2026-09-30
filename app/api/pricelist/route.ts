import { getProducts } from "@/lib/server/catalog";

export async function GET() {
  const products = await getProducts();
  const header = ["sku", "name", "category", "base", "coating", "price_rub_vat20", "unit", "pack", "stock"];
  const lines = [
    header.join(";"),
    ...products.map((p) =>
      [p.sku, p.name, p.category, p.base, p.coating, p.price, p.unit, p.minQty, p.stock]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(";")
    ),
  ];
  const bom = "\uFEFF";
  return new Response(bom + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="zevsprotect-price.csv"',
    },
  });
}
