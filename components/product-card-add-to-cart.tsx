"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { productCoatingOptions } from "@/lib/product-options";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

function ProductOptionChips({
  values,
  value,
  onChange,
  shop = false,
  className,
}: {
  values: string[];
  value: string;
  onChange: (value: string) => void;
  shop?: boolean;
  className?: string;
}) {
  if (!values.length) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {values.map((option) => {
        const active = option === value;
        const chipClass = cn(
          "rounded-md border px-2 py-1 text-xs",
          shop
            ? active
              ? "border-orange bg-orange text-white"
              : "border-white/20 text-white/80 hover:border-orange"
            : active
              ? "border-ink bg-ink text-paper"
              : "hover:border-orange",
        );

        if (values.length === 1) {
          return (
            <span key={option} className={chipClass}>
              {option}
            </span>
          );
        }

        return (
          <button
            key={option}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(option);
            }}
            className={chipClass}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function coatingChipClass(shop: boolean, interactive = false) {
  return cn(
    "inline-flex max-w-[11rem] items-center gap-1 rounded-md border px-2 py-1 text-xs",
    shop
      ? "border-orange bg-orange text-white"
      : "border-ink bg-ink text-paper",
    interactive && "cursor-pointer",
  );
}

export function ProductCoatingSelect({
  values,
  value,
  onChange,
  shop = false,
}: {
  values: string[];
  value: string;
  onChange: (value: string) => void;
  shop?: boolean;
}) {
  if (!values.length) return null;

  if (values.length === 1) {
    return (
      <span className={cn(coatingChipClass(shop), "ml-auto shrink-0 truncate")}>
        {values[0]}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Покрытие: ${value}`}
        type="button"
        className={cn(coatingChipClass(shop, true), "ml-auto shrink-0")}
      >
        <span className="min-w-0 truncate">{value}</span>
        <ChevronDown className="size-3 shrink-0 opacity-80" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem] w-auto">
        {values.map((option) => (
          <DropdownMenuItem
            key={option}
            className={cn("text-xs", option === value && "font-medium")}
            onClick={() => onChange(option)}
          >
            {option}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ProductVariantChips({
  product,
  size,
  coating,
  onSizeChange,
  onCoatingChange,
  shop = false,
}: {
  product: Product;
  size: string;
  coating: string;
  onSizeChange: (size: string) => void;
  onCoatingChange: (coating: string) => void;
  shop?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <ProductOptionChips
        values={product.sizes}
        value={size}
        onChange={onSizeChange}
        shop={shop}
        className="min-w-0"
      />
      <ProductCoatingSelect
        values={productCoatingOptions(product)}
        value={coating}
        onChange={onCoatingChange}
        shop={shop}
      />
    </div>
  );
}

export function ProductSizeChips({
  product,
  size,
  onSizeChange,
  shop = false,
}: {
  product: Product;
  size: string;
  onSizeChange: (size: string) => void;
  shop?: boolean;
}) {
  return (
    <ProductOptionChips
      values={product.sizes}
      value={size}
      onChange={onSizeChange}
      shop={shop}
    />
  );
}

export function ProductCardAddToCart({
  product,
  qty,
  shop = false,
}: {
  product: Product;
  qty: number;
  shop?: boolean;
}) {
  const { addToCart } = useStore();
  const coatings = productCoatingOptions(product);
  const [size, setSize] = useState(product.sizes[0] ?? "L");
  const [coating, setCoating] = useState(coatings[0] ?? product.coating);
  const inStock = product.stock > 0;

  return (
    <div className="grid gap-2">
      <div className={cn(!shop && "flex min-h-[3.75rem] items-start")}>
        <ProductVariantChips
          product={product}
          size={size}
          coating={coating}
          onSizeChange={setSize}
          onCoatingChange={setCoating}
          shop={shop}
        />
      </div>
      <Button
        className={cn("h-9 w-full", shop && "bg-orange text-white hover:bg-orange-dk")}
        disabled={!inStock}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!inStock) return;
          addToCart(product.id, size, qty, coating);
          toast.success("Добавлено в корзину");
        }}
      >
        {inStock ? "В корзину" : "Под заказ"}
      </Button>
    </div>
  );
}
