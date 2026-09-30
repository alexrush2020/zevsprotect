export type CategorySlug =
  | "mehanika"
  | "holod"
  | "zhar"
  | "mbs"
  | "himiya"
  | "kragi"
  | "rukavitsy";

export type Product = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  category: CategorySlug;
  base: string;
  coating: string;
  color: string;
  sizes: string[];
  price: number;
  minQty: number;
  packSizes?: number[];
  stock: number;
  unit: string;
  weight?: string;
  length?: string;
  tex?: string;
  knitClass?: string;
  coatingType?: string;
  description: string;
  image: string;
  images: string[];
  featured?: boolean;
  documents?: { title: string; href: string }[];
};

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  image: string;
  content: string[];
  slides?: { src: string; title: string; alt: string }[];
  home?: boolean;
  updatedAt?: string;
  /** SEO-поля Payload (плагин seo); пусто — берутся title/excerpt/cover. */
  seo?: { title?: string; description?: string; image?: string };
};

export type OrderStatus =
  | "accepted"
  | "picking"
  | "shipped"
  | "delivery"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "invoice_auto" | "invoice_manager" | "online";

export type CartItem = {
  productId: string;
  size: string;
  coating?: string;
  qty: number;
};

export type AccountKind = "person" | "legal";

export type DeliveryAddress = {
  id: string;
  label: string;
  city: string;
  line: string;
  phone?: string;
  isDefault?: boolean;
};

export type RequestDelivery = "cdek" | "terminal" | "pickup";

export type Lead = {
  id: string;
  createdAt: string;
  type: string;
  payload: Record<string, string>;
};

export type UserProfile = {
  customerId?: string;
  email: string;
  name: string;
  phone: string;
  company: string;
  inn: string;
  kpp?: string;
  address: string;
  addresses?: DeliveryAddress[];
  kind?: AccountKind;
  bankName?: string;
  bankAccount?: string;
  bik?: string;
  authProvider?: "phone" | "yandex" | "demo" | "password";
};

export type Order = {
  id: string;
  createdAt: string;
  items: CartItem[];
  profile: UserProfile;
  comment: string;
  payment: PaymentMethod;
  paymentStatus: "pending" | "invoiced" | "paid" | "failed";
  status: OrderStatus;
  total: number;
  guest: boolean;
  city?: string;
  carrier?: string;
  carrierName?: string;
  deliveryCost?: number;
};

export type PassagePlate = {
  company: string;
  city: string;
  line: string;
  text: string;
  fact: string;
};

export type PassageStamp = {
  label: string;
  redacted: boolean;
};
