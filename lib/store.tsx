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
import { snapPackQty } from "@/lib/qty";
import type {
  CartItem,
  Order,
  PaymentMethod,
  UserProfile,
} from "@/lib/types";

const CART_KEY = "zp-cart";
const USER_KEY = "zp-user";
const ORDERS_KEY = "zp-orders";
const LEADS_KEY = "zp-leads";

const demoProfile: UserProfile = {
  email: "zakup@roststroy.ru",
  name: "Ирина Ковалёва",
  phone: "+7 (863) 200-00-15",
  company: "ООО «РостСтрой»",
  inn: "6165123456",
  kpp: "616501001",
  address: "г. Ростов-на-Дону, ул. Серафимовича, 53",
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
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

type Lead = {
  id: string;
  createdAt: string;
  type: string;
  payload: Record<string, string>;
};

type Store = {
  cart: CartItem[];
  user: UserProfile | null;
  orders: Order[];
  leads: Lead[];
  addToCart: (productId: string, size: string, qty: number) => void;
  setQty: (productId: string, size: string, qty: number) => void;
  removeFromCart: (productId: string, size: string) => void;
  clearCart: () => void;
  login: (email: string, password: string) => boolean;
  register: (profile: UserProfile, password: string) => boolean;
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

function seedOrders(): Order[] {
  return [
    {
      id: "ZP-10428",
      createdAt: "2026-08-21T10:15:00.000Z",
      items: [
        { productId: "p-atlant", size: "L", qty: 200 },
        { productId: "p-frost", size: "L", qty: 40 },
      ],
      profile: demoProfile,
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
      id: "ZP-10501",
      createdAt: "2026-09-08T08:40:00.000Z",
      items: [{ productId: "p-shield", size: "L", qty: 100 }],
      profile: demoProfile,
      comment: "",
      payment: "invoice_manager",
      paymentStatus: "invoiced",
      status: "picking",
      total: 64 * 100 + 0,
      guest: false,
      city: "Таганрог",
      carrier: "pickup",
      carrierName: "Самовывоз, Таганрог",
      deliveryCost: 0,
    },
  ];
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const nextCart = readJson<CartItem[]>(CART_KEY, []);
    const nextUser = readJson<UserProfile | null>(USER_KEY, null);
    const nextOrders = readJson<Order[]>(ORDERS_KEY, []);
    const nextLeads = readJson<Lead[]>(LEADS_KEY, []);
    setCart(nextCart);
    setUser(nextUser);
    setOrders(
      nextOrders.length
        ? nextOrders
        : nextUser
          ? seedOrders()
          : seedGuestOrders()
    );
    setLeads(nextLeads);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, ready]);

  useEffect(() => {
    if (!ready) return;
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }, [orders, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
  }, [leads, ready]);

  const addToCart = useCallback((productId: string, size: string, qty: number) => {
    const product = products.find((x) => x.id === productId);
    const snapped = snapPackQty(qty, product?.packQty ?? 1);
    if (!snapped) return;
    setCart((prev) => {
      const i = prev.findIndex((x) => x.productId === productId && x.size === size);
      if (i === -1) return [...prev, { productId, size, qty: snapped }];
      const copy = [...prev];
      copy[i] = {
        ...copy[i],
        qty: snapPackQty(copy[i].qty + snapped, product?.packQty ?? 1),
      };
      return copy;
    });
  }, []);

  const setQty = useCallback((productId: string, size: string, qty: number) => {
    const product = products.find((x) => x.id === productId);
    const snapped = snapPackQty(qty, product?.packQty ?? 1);
    setCart((prev) =>
      prev
        .map((x) =>
          x.productId === productId && x.size === size ? { ...x, qty: snapped } : x
        )
        .filter((x) => x.qty > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId: string, size: string) => {
    setCart((prev) => prev.filter((x) => !(x.productId === productId && x.size === size)));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const login = useCallback((email: string, password: string) => {
    if (!password.trim()) return false;
    const existing = readJson<UserProfile | null>(USER_KEY, null);
    const profile =
      existing && existing.email === email
        ? existing
        : { ...demoProfile, email };
    setUser(profile);
    setOrders((prev) => {
      const ids = new Set(prev.map((o) => o.id));
      const extra = seedOrders().filter((o) => !ids.has(o.id));
      if (extra.length) return [...extra, ...prev];
      return prev.length ? prev : seedOrders();
    });
    return true;
  }, []);

  const register = useCallback((profile: UserProfile, password: string) => {
    if (!password.trim() || !profile.email) return false;
    setUser(profile);
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const updateProfile = useCallback((profile: UserProfile) => {
    setUser(profile);
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
      const goods = cart.reduce((sum, item) => {
        const p = products.find((x) => x.id === item.productId);
        return sum + (p ? p.price * item.qty : 0);
      }, 0);
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

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((sum, item) => {
    const p = products.find((x) => x.id === item.productId);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);

  const value = useMemo(
    () => ({
      cart,
      user,
      orders,
      leads,
      addToCart,
      setQty,
      removeFromCart,
      clearCart,
      login,
      register,
      logout,
      updateProfile,
      placeOrder,
      updateOrder,
      addLead,
      cartCount,
      cartTotal,
    }),
    [
      cart,
      user,
      orders,
      leads,
      addToCart,
      setQty,
      removeFromCart,
      clearCart,
      login,
      register,
      logout,
      updateProfile,
      placeOrder,
      updateOrder,
      addLead,
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
