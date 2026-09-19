import Link from "next/link";
import { productMetaLine, type ManagerChatProductRef } from "@/lib/manager-chat";

export function ManagerChatProductCard({ product }: { product: ManagerChatProductRef }) {
  return (
    <Link
      className="manager-chat-product-card"
      href={`/product/${product.slug}`}
      aria-label={`Открыть карточку: ${product.title}`}
    >
      <span
        className="manager-chat-product-card__thumb"
        style={{ backgroundImage: `url("${product.image}")` }}
        aria-hidden="true"
      />
      <span className="manager-chat-product-card__copy">
        <span className="manager-chat-product-card__label">Уточнить по товару</span>
        <strong>{product.title}</strong>
        <span>
          {product.sku} · {productMetaLine(product)}
        </span>
      </span>
      <span className="manager-chat-product-card__arrow" aria-hidden="true">
        →
      </span>
    </Link>
  );
}
