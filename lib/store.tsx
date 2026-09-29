"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { products } from "@/lib/data/catalog";
import { cartGoodsTotal, cartLineKey } from "@/lib/lots";
import { snapOrderQty } from "@/lib/order-qty";
import { demoAccount, yandexStubAccount } from "@/lib/demo-account";
import { logoutRequest, meRequest } from "@/lib/auth-client";
import type {
  CartItem,
  Lead,
  Order,
  PaymentMethod,
  UserProfile,
} from "@/lib/types";

const CART_KEY = "zp-cart";
const USER_KEY = "zp-user";
const LAST_USER_KEY = "zp-last-user";
const ORDERS_KEY = "zp-orders";
const LEADS_KEY = "zp-leads";
const FAVORITES_KEY = "zp-favorites";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function normalizeCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const merged = new Map<string, CartItem>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const item = row as CartItem & { lotId?: string };
    if (!item.productId || !item.size) continue;
    const qty = Number(item.qty);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const key = cartLineKey(item);
    const prev = merged.get(key);
    merged.set(key, {
      productId: item.productId,
      size: item.size,
      coating: item.coating,
      qty: (prev?.qty ?? 0) + qty,
    });
  }
  return [...merged.values()]
    .map((item) => {
      const product = products.find((x) => x.id === item.productId);
      if (!product) return item;
      const qty = snapOrderQty(item.qty, product, { allowZero: true });
      if (!qty) return null;
      return { ...item, qty };
    })
    .filter((item): item is CartItem => Boolean(item));
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

type Store = {
  cart: CartItem[];
  user: UserProfile | null;
  lastUser: UserProfile | null;
  ready: boolean;
  orders: Order[];
  leads: Lead[];
  favoriteIds: string[];
  addToCart: (productId: string, size: string, qty: number, coating?: string) => void;
  setQty: (productId: string, size: string, qty: number, coating?: string) => void;
  removeFromCart: (productId: string, size: string, coating?: string) => void;
  removeProductFromCart: (productId: string) => void;
  clearCart: () => void;
  login: (email: string, password: string) => boolean;
  register: (profile: UserProfile, password?: string) => boolean;
  loginYandex: () => boolean;
  loginDemo: () => boolean;
  resumeSession: () => boolean;
  logout: () => void;
  updateProfile: (profile: UserProfile) => void;
  placeOrder: (input: {
    profile: UserProfile;
    comment: string;
    payment: PaymentMethod;
    guest: boolean;
    city?: string;
    carrier?: string;
    carrierName?: string;
    deliveryCost?: number;
  }) => Order;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  addLead: (type: string, payload: Record<string, string>) => Lead;
  toggleFavorite: (productId: string) => boolean;
  isFavorite: (productId: string) => boolean;
  cartCount: number;
  cartTotal: number;
};

const StoreContext = createContext<Store | null>(null);

function seedGuestOrders(): Order[] {
  return [
    {
      id: "ZP-10990",
      createdAt: "2026-09-12T11:20:00.000Z",
      items: [{ productId: "p-atlant", size: "L", qty: 50 }],
      profile: {
        email: "gost@example.ru",
        name: "Алексей Гость",
        phone: "+7 (863) 111-22-33",
        company: "",
        inn: "",
        kpp: "",
        address: "г. Краснодар, ул. Красная, 10",
      },
      comment: "Гостевой заказ для проверки трека.",
      payment: "invoice_auto",
      paymentStatus: "invoiced",
      status: "shipped",
      total: 28.9 * 50 + 640,
      guest: true,
      city: "Краснодар",
      carrier: "cdek",
      carrierName: "СДЭК",
      deliveryCost: 640,
    },
  ];
}

function sortOrders(orders: Order[]) {
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function mergeSeedOrders(existing: Order[]) {
  const ids = new Set(existing.map((o) => o.id));
  const extra = seedOrders().filter((o) => !ids.has(o.id));
  if (!existing.length) return seedOrders();
  return extra.length ? sortOrders([...existing, ...extra]) : sortOrders(existing);
}

function seedOrders(): Order[] {
  return sortOrders([
    {
      id: "ZP-10588",
      createdAt: "2026-09-17T09:10:00.000Z",
      items: [
        { productId: "p-cut", size: "XL", qty: 80 },
        { productId: "p-hvat", size: "L", qty: 200 },
      ],
      profile: demoAccount,
      comment: "На склад Ростов, XL для резки арматуры.",
      payment: "invoice_manager",
      paymentStatus: "invoiced",
      status: "accepted",
      total: 96 * 80 + 39 * 200 + 1280,
      guest: false,
      city: "Ростов-на-Дону",
      carrier: "cdek",
      carrierName: "СДЭК",
      deliveryCost: 1280,
    },
    {
      id: "ZP-10562",
      createdAt: "2026-09-15T14:05:00.000Z",
      items: [{ productId: "p-fenix", size: "XL", qty: 40 }],
      profile: demoAccount,
      comment: "Жар на объекте Таганрог, самовывоз.",
      payment: "invoice_auto",
      paymentStatus: "invoiced",
      status: "accepted",
      total: 710 * 40,
      guest: false,
      city: "Таганрог",
      carrier: "pickup",
      carrierName: "Самовывоз, Таганрог",
      deliveryCost: 0,
    },
    {
      id: "ZP-10540",
      createdAt: "2026-09-11T07:50:00.000Z",
      items: [{ productId: "p-kragi-lux", size: "L", qty: 60 }],
      profile: demoAccount,
      comment: "Сварка, Волгоград. Декларацию вложить в короб.",
      payment: "invoice_auto",
      paymentStatus: "paid",
      status: "shipped",
      total: 310 * 60 + 2180,
      guest: false,
      city: "Волгоград",
      carrier: "dl",
      carrierName: "Деловые линии",
      deliveryCost: 2180,
    },
    {
      id: "ZP-10501",
      createdAt: "2026-09-08T08:40:00.000Z",
      items: [{ productId: "p-shield", size: "L", qty: 100 }],
      profile: demoAccount,
      comment: "",
      payment: "invoice_manager",
      paymentStatus: "invoiced",
      status: "picking",
      total: 64 * 100,
      guest: false,
      city: "Таганрог",
      carrier: "pickup",
      carrierName: "Самовывоз, Таганрог",
      deliveryCost: 0,
    },
    {
      id: "ZP-10520",
      createdAt: "2026-09-05T11:25:00.000Z",
      items: [
        { productId: "p-frost-lux", size: "L", qty: 80 },
        { productId: "p-fleece", size: "XL", qty: 40 },
      ],
      profile: demoAccount,
      comment: "Холод, ночная смена. Нужны XL отдельно подписать.",
      payment: "invoice_auto",
      paymentStatus: "paid",
      status: "delivery",
      total: 104 * 80 + 115 * 40 + 1460,
      guest: false,
      city: "Краснодар",
      carrier: "energy",
      carrierName: "Энергия",
      deliveryCost: 1460,
    },
    {
      id: "ZP-10480",
      createdAt: "2026-08-28T13:00:00.000Z",
      items: [{ productId: "p-oilmax", size: "L", qty: 150 }],
      profile: demoAccount,
      comment: "МБС на площадку Воронеж.",
      payment: "invoice_manager",
      paymentStatus: "paid",
      status: "delivered",
      total: 78 * 150 + 980,
      guest: false,
      city: "Воронеж",
      carrier: "pek",
      carrierName: "ПЭК",
      deliveryCost: 980,
    },
    {
      id: "ZP-10428",
      createdAt: "2026-08-21T10:15:00.000Z",
      items: [
        { productId: "p-atlant", size: "L", qty: 200 },
        { productId: "p-frost", size: "L", qty: 40 },
      ],
      profile: demoAccount,
      comment: "Отгрузка на склад Ростов, нужны сертификаты в комплекте.",
      payment: "invoice_auto",
      paymentStatus: "paid",
      status: "delivered",
      total: 28.9 * 200 + 89 * 40 + 890,
      guest: false,
      city: "Ростов-на-Дону",
      carrier: "cdek",
      carrierName: "СДЭК",
      deliveryCost: 890,
    },
    {
      id: "ZP-10450",
      createdAt: "2026-08-14T09:40:00.000Z",
      items: [
        { productId: "p-malahit", size: "L", qty: 250 },
        { productId: "p-profi-vl", size: "L", qty: 100 },
      ],
      profile: demoAccount,
      comment: "",
      payment: "invoice_auto",
      paymentStatus: "paid",
      status: "delivered",
      total: 42 * 250 + 48 * 100 + 1100,
      guest: false,
      city: "Ростов-на-Дону",
      carrier: "cdek",
      carrierName: "СДЭК",
      deliveryCost: 1100,
    },
    {
      id: "ZP-10402",
      createdAt: "2026-08-04T16:20:00.000Z",
      items: [{ productId: "p-universal", size: "L", qty: 500 }],
      profile: demoAccount,
      comment: "Отменили: позиция ушла в другую заявку.",
      payment: "online",
      paymentStatus: "failed",
      status: "cancelled",
      total: 19.2 * 500,
      guest: false,
      city: "Ростов-на-Дону",
      carrier: "cdek",
      carrierName: "СДЭК",
      deliveryCost: 0,
    },
    {
      id: "ZP-10390",
      createdAt: "2026-07-22T08:15:00.000Z",
      items: [
        { productId: "p-optima", size: "L", qty: 1000 },
        { productId: "p-standart", size: "L", qty: 400 },
      ],
      profile: demoAccount,
      comment: "Расходники на сезон, склад Ростов.",
      payment: "invoice_auto",
      paymentStatus: "paid",
      status: "delivered",
      total: 18.4 * 1000 + 21.5 * 400 + 1680,
      guest: false,
      city: "Ростов-на-Дону",
      carrier: "cdek",
      carrierName: "СДЭК",
      deliveryCost: 1680,
    },
    {
      id: "ZP-10355",
      createdAt: "2026-06-18T10:00:00.000Z",
      items: [
        { productId: "p-kragi-kevlar", size: "L", qty: 40 },
        { productId: "p-driver", size: "L", qty: 30 },
      ],
      profile: demoAccount,
      comment: "Сварочный участок, самовывоз.",
      payment: "invoice_manager",
      paymentStatus: "paid",
      status: "delivered",
      total: 420 * 40 + 265 * 30,
      guest: false,
      city: "Таганрог",
      carrier: "pickup",
      carrierName: "Самовывоз, Таганрог",
      deliveryCost: 0,
    },
    {
      id: "ZP-10012",
      createdAt: "2025-12-11T12:30:00.000Z",
      items: [
        { productId: "p-atlant", size: "L", qty: 300 },
        { productId: "p-ruk-brez", size: "L", qty: 80 },
      ],
      profile: demoAccount,
      comment: "Первая партия на склад Ростов.",
      payment: "invoice_auto",
      paymentStatus: "paid",
      status: "delivered",
      total: 28.9 * 300 + 72 * 80 + 820,
      guest: false,
      city: "Ростов-на-Дону",
      carrier: "cdek",
      carrierName: "СДЭК",
      deliveryCost: 820,
    },
  ]);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [lastUser, setLastUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const nextCart = normalizeCart(readJson<unknown>(CART_KEY, []));
    const nextUser = readJson<UserProfile | null>(USER_KEY, null);
    const nextLastUser =
      readJson<UserProfile | null>(LAST_USER_KEY, null) ?? demoAccount;
    const nextOrders = readJson<Order[]>(ORDERS_KEY, []);
    const nextLeads = readJson<Lead[]>(LEADS_KEY, []);
    const nextFavorites = readJson<string[]>(FAVORITES_KEY, []);
    setCart(nextCart);
    setUser(nextUser);
    setLastUser(nextLastUser);
    setOrders(
      nextOrders.length
        ? nextUser?.email === demoAccount.email
          ? mergeSeedOrders(nextOrders)
          : nextOrders
        : nextUser
          ? seedOrders()
          : seedGuestOrders(),
    );
    setLeads(nextLeads);
    setFavoriteIds(Array.isArray(nextFavorites) ? nextFavorites : []);
    setReady(true);
    // серверная сессия Payload — источник истины для реальных аккаунтов
    void meRequest().then((me) => {
      if (me) setUser(me);
      else setUser((cur) => (cur?.authProvider === "password" ? null : cur));
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, ready]);

  useEffect(() => {
    if (!ready) return;
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(LAST_USER_KEY, JSON.stringify(user));
      setLastUser(user);
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user, ready]);

  useEffect(() => {
    if (!ready) return;
    if (lastUser) localStorage.setItem(LAST_USER_KEY, JSON.stringify(lastUser));
  }, [lastUser, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }, [orders, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
  }, [leads, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds, ready]);

  const addToCart = useCallback((productId: string, size: string, qty: number, coating?: string) => {
    const product = products.find((x) => x.id === productId);
    if (!product) return;
    const snapped = snapOrderQty(qty, product);
    setCart((prev) => {
      const i = prev.findIndex((x) => cartLineKey(x) === cartLineKey({ productId, size, coating }));
      if (i === -1) return [...prev, { productId, size, coating, qty: snapped }];
      const copy = [...prev];
      copy[i] = {
        ...copy[i],
        qty: snapOrderQty(copy[i].qty + snapped, product),
      };
      return copy;
    });
  }, []);

  const setQty = useCallback((productId: string, size: string, qty: number, coating?: string) => {
    const product = products.find((x) => x.id === productId);
    if (!product) return;
    const snapped = snapOrderQty(qty, product, { allowZero: true });
    setCart((prev) => {
      const i = prev.findIndex((x) => cartLineKey(x) === cartLineKey({ productId, size, coating }));
      if (!snapped) {
        return i === -1 ? prev : prev.filter((_, idx) => idx !== i);
      }
      const next: CartItem = { productId, size, coating, qty: snapped };
      if (i === -1) return [...prev, next];
      const copy = [...prev];
      copy[i] = next;
      return copy;
    });
  }, []);

  const removeFromCart = useCallback((productId: string, size: string, coating?: string) => {
    setCart((prev) =>
      prev.filter((x) => cartLineKey(x) !== cartLineKey({ productId, size, coating })),
    );
  }, []);

  const removeProductFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((x) => x.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const attachDemoOrders = useCallback(() => {
    setOrders((prev) => mergeSeedOrders(prev));
  }, []);

  const enterAccount = useCallback(
    (profile: UserProfile, withDemoOrders = false) => {
      setUser(profile);
      setLastUser(profile);
      if (withDemoOrders || profile.email === demoAccount.email) {
        attachDemoOrders();
        setFavoriteIds((prev) =>
          prev.length ? prev : ["p-atlant", "p-fenix", "p-shield"],
        );
      }
    },
    [attachDemoOrders],
  );

  const login = useCallback(
    (email: string, password: string) => {
      if (!password.trim()) return false;
      const existing = readJson<UserProfile | null>(USER_KEY, null);
      const remembered = readJson<UserProfile | null>(LAST_USER_KEY, null);
      const profile =
        existing && existing.email === email
          ? existing
          : remembered && remembered.email === email
            ? remembered
            : email === demoAccount.email
              ? demoAccount
              : { ...demoAccount, email };
      enterAccount(profile, profile.email === demoAccount.email);
      return true;
    },
    [enterAccount],
  );

  const register = useCallback(
    (profile: UserProfile, password?: string) => {
      if (password !== undefined && !password.trim()) return false;
      if (!profile.email && !profile.phone) return false;
      enterAccount(profile, false);
      return true;
    },
    [enterAccount],
  );

  const loginYandex = useCallback(() => {
    const remembered = lastUser?.authProvider === "yandex" ? lastUser : null;
    enterAccount(remembered ?? yandexStubAccount, false);
    return true;
  }, [enterAccount, lastUser]);

  const loginDemo = useCallback(() => {
    enterAccount(demoAccount, true);
    return true;
  }, [enterAccount]);

  const resumeSession = useCallback(() => {
    const remembered = lastUser ?? demoAccount;
    enterAccount(remembered, remembered.email === demoAccount.email);
    return true;
  }, [enterAccount, lastUser]);

  const logout = useCallback(() => {
    void logoutRequest();
    setUser((current) => {
      if (current) setLastUser(current);
      return null;
    });
  }, []);

  const updateProfile = useCallback((profile: UserProfile) => {
    setUser((prev) => (prev ? { ...prev, ...profile } : profile));
  }, []);

  const placeOrder = useCallback(
    (input: {
      profile: UserProfile;
      comment: string;
      payment: PaymentMethod;
      guest: boolean;
      city?: string;
      carrier?: string;
      carrierName?: string;
      deliveryCost?: number;
    }) => {
      const goods = cartGoodsTotal(cart, products);
      const deliveryCost = input.deliveryCost ?? 0;
      const order: Order = {
        id: uid("ZP"),
        createdAt: new Date().toISOString(),
        items: cart,
        profile: input.profile,
        comment: input.comment,
        payment: input.payment,
        paymentStatus:
          input.payment === "online"
            ? "pending"
            : input.payment === "invoice_auto"
              ? "invoiced"
              : "pending",
        status: "accepted",
        total: goods + deliveryCost,
        guest: input.guest,
        city: input.city,
        carrier: input.carrier,
        carrierName: input.carrierName,
        deliveryCost,
      };
      setOrders((prev) => [order, ...prev]);
      setCart([]);
      return order;
    },
    [cart]
  );

  const updateOrder = useCallback((id: string, patch: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }, []);

  const addLead = useCallback((type: string, payload: Record<string, string>) => {
    const lead: Lead = {
      id: uid("LEAD"),
      createdAt: new Date().toISOString(),
      type,
      payload,
    };
    setLeads((prev) => [lead, ...prev]);
    return lead;
  }, []);

  const toggleFavorite = useCallback((productId: string) => {
    const added = !favoriteIds.includes(productId);
    setFavoriteIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
    return added;
  }, [favoriteIds]);

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.includes(productId),
    [favoriteIds]
  );

  const cartCount = cart.length;
  const cartTotal = cartGoodsTotal(cart, products);

  const value = useMemo(
    () => ({
      cart,
      user,
      lastUser,
      ready,
      orders,
      leads,
      favoriteIds,
      addToCart,
      setQty,
      removeFromCart,
      removeProductFromCart,
      clearCart,
      login,
      register,
      loginYandex,
      loginDemo,
      resumeSession,
      logout,
      updateProfile,
      placeOrder,
      updateOrder,
      addLead,
      toggleFavorite,
      isFavorite,
      cartCount,
      cartTotal,
    }),
    [
      cart,
      user,
      lastUser,
      ready,
      orders,
      leads,
      favoriteIds,
      addToCart,
      setQty,
      removeFromCart,
      removeProductFromCart,
      clearCart,
      login,
      register,
      loginYandex,
      loginDemo,
      resumeSession,
      logout,
      updateProfile,
      placeOrder,
      updateOrder,
      addLead,
      toggleFavorite,
      isFavorite,
      cartCount,
      cartTotal,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
