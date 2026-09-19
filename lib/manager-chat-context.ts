import { getProduct } from "@/lib/data/catalog";
import { contextFromProduct, toManagerChatProduct, type ManagerChatContext } from "@/lib/manager-chat";

export function resolveManagerChatContext(pathname: string): ManagerChatContext {
  const match = pathname.match(/^\/product\/([^/]+)\/?$/);
  if (!match?.[1]) return { kind: "none" };
  const product = getProduct(decodeURIComponent(match[1]));
  return product ? contextFromProduct(toManagerChatProduct(product)) : { kind: "none" };
}
