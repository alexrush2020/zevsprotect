import { brand } from "@/lib/brand";
import type { DeliveryAddress, UserProfile } from "@/lib/types";

export const PICKUP_ADDRESS: DeliveryAddress = {
  id: "addr-pickup",
  label: "Склад Таганрог",
  city: "Таганрог",
  line: "Поляковское шоссе, 17",
  phone: brand.phone,
};

export function formatAddressLine(addr: Pick<DeliveryAddress, "city" | "line">) {
  return [addr.city, addr.line].filter(Boolean).join(", ");
}

export function addressesOf(user: UserProfile | null | undefined): DeliveryAddress[] {
  if (!user) return [];
  const list = user.addresses?.length
    ? user.addresses
    : user.address.trim()
      ? [
          {
            id: "addr-main",
            label: "Основной",
            city: "",
            line: user.address,
            isDefault: true,
          },
        ]
      : [];
  return list.map((addr) => ({
    ...addr,
    phone: addr.phone?.trim() || user.phone,
  }));
}

export function defaultAddress(user: UserProfile | null | undefined) {
  const list = addressesOf(user);
  return list.find((a) => a.isDefault) ?? list[0];
}
