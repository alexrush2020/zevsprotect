import Link from "next/link";
import { formatPrice } from "@/lib/format";
import {
  formatShiftCount,
  shiftCompareRows,
} from "@/lib/volume-quote";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/** catalog — товары витрины из Payload. */
export function ProductShiftCompare({ product, catalog }: { product: Product; catalog: Product[] }) {
  const rows = shiftCompareRows(product, catalog);
  if (rows.length < 2) return null;

  const winner = rows.find((row) => row.bestShift) ?? rows[0];
  const current = rows.find((row) => row.current) ?? rows[0];
  const saving =
    current.perShift > winner.perShift
      ? Math.round((1 - winner.perShift / current.perShift) * 100)
      : 0;

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border bg-card">
      <div className="px-4 pt-4">
        <p className="text-xs uppercase tracking-[0.16em] text-steel">Расход на смену</p>
        <p className="mt-1 text-sm text-steel">
          Дешёвая пара может выйти дороже: производство платит за смену, а не за строку в счёте.
        </p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[18rem] text-sm">
          <thead>
            <tr className="border-y text-left text-[11px] uppercase tracking-[0.12em] text-steel">
              <th className="px-4 py-2 font-normal">Модель</th>
              <th className="px-3 py-2 text-right font-normal">₽/пара</th>
              <th className="px-3 py-2 text-right font-normal">₽/смена</th>
              <th className="px-4 py-2 text-right font-normal">Ресурс</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const shortName = row.product.name.replace(/^Перчатки\s+/i, "").replace(/[«»]/g, "");
              const cell = (
                <span className={cn(row.current && "font-medium")}>{shortName}</span>
              );
              return (
                <tr
                  key={row.product.id}
                  className={cn(
                    "border-b last:border-b-0",
                    row.current && "bg-orange/5",
                    row.bestShift && !row.current && "bg-muted/40",
                  )}
                >
                  <td className="px-4 py-2.5">
                    {row.current ? (
                      cell
                    ) : (
                      <Link href={`/product/${row.product.slug}`} className="hover:text-orange">
                        {cell}
                      </Link>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatPrice(row.unitPrice)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right tabular-nums",
                      row.bestShift && "font-medium text-orange",
                    )}
                  >
                    {formatPrice(row.perShift)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-steel">
                    {formatShiftCount(row.shifts)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-xs text-steel">
        {saving > 0
          ? `${winner.product.name.replace(/^Перчатки\s+/i, "")} дешевле на ${saving}% за смену — меньше замен на участке.`
          : `${current.product.name.replace(/^Перчатки\s+/i, "")} выгоднее по расходу на смену в этой линейке.`}
        <span className="text-steel/70"> Ресурс — оценка для прототипа, не протокол испытаний.</span>
      </p>
    </div>
  );
}
