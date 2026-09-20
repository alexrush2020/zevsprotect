"use client";

import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  formatAddressLine,
  PICKUP_ADDRESS,
} from "@/lib/addresses";
import type { DeliveryAddress } from "@/lib/types";

export function DeliveryAddressPicker({
  addresses,
  pickup,
  selectedId,
  onSelect,
  manual,
  onManualChange,
  manualValue,
  onManualValueChange,
}: {
  addresses: DeliveryAddress[];
  pickup?: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  manual: boolean;
  onManualChange: (value: boolean) => void;
  manualValue: string;
  onManualValueChange: (value: string) => void;
}) {
  if (pickup) {
    return (
      <div className="rounded-xl border bg-background p-3">
        <p className="font-medium">{PICKUP_ADDRESS.label}</p>
        <p className="mt-0.5 text-sm text-steel">
          {formatAddressLine(PICKUP_ADDRESS)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {addresses.length > 0 && !manual ? (
        <RadioGroup value={selectedId} onValueChange={(v) => v && onSelect(v)}>
          {addresses.map((addr) => (
            <label
              key={addr.id}
              className="flex items-start gap-3 rounded-xl border bg-background p-3"
            >
              <RadioGroupItem value={addr.id} />
              <span>
                <span className="block font-medium">{addr.label}</span>
                <span className="block text-sm text-steel">
                  {formatAddressLine(addr)}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
      ) : (
        <Input
          id="address"
          name="address"
          value={manualValue}
          onChange={(e) => onManualValueChange(e.target.value)}
          placeholder="Город, улица, пункт выдачи или адрес…"
          aria-label="Адрес доставки"
          required
        />
      )}
      {addresses.length > 0 ? (
        <label className="flex items-center gap-2 text-sm text-steel">
          <Checkbox
            checked={manual}
            onCheckedChange={(v) => onManualChange(v === true)}
          />
          Указать адрес вручную
        </label>
      ) : null}
    </div>
  );
}
