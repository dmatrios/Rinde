"use client";

import { useState } from "react";
import { NumericInput } from "@/components/ui/numeric-input";
import { decimalToCents, formatMoney } from "@/lib/finance/money";
import type { PaymentMethod } from "@/types/database";

const methods: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
  { value: "card", label: "Tarjeta" },
];

export function PaymentFields({
  defaultMethod,
  defaultCashPaid = null,
  amount,
  canLinkShift,
  linkedToShift = false,
  disabled = false,
}: {
  defaultMethod?: PaymentMethod | null;
  defaultCashPaid?: number | null;
  amount: string;
  canLinkShift: boolean;
  linkedToShift?: boolean;
  disabled?: boolean;
}) {
  const [method, setMethod] = useState<PaymentMethod | null>(
    defaultMethod === undefined ? "cash" : defaultMethod,
  );
  const [cashPaid, setCashPaid] = useState(
    defaultCashPaid === null ? "" : String(defaultCashPaid),
  );
  const change =
    cashPaid && amount
      ? decimalToCents(cashPaid) - decimalToCents(amount)
      : null;
  return (
    <div className="space-y-3">
      <input type="hidden" name="canChooseShift" value={String(canLinkShift)} />
      <fieldset>
        <legend className="mb-2 text-xs font-semibold">Método de pago</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {methods.map(({ value, label }) => (
            <label key={value} className="cursor-pointer">
              <input
                className="peer sr-only"
                type="radio"
                name="paymentMethod"
                value={value}
                checked={method === value}
                onChange={() => setMethod(value)}
                required
                disabled={disabled}
              />
              <span className="flex min-h-10 items-center justify-center rounded-xl border border-input px-1 text-xs font-medium transition-colors peer-checked:border-primary peer-checked:bg-secondary peer-checked:text-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/25">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {method === "cash" && (
        <div>
          <label
            htmlFor="expense-cash-paid"
            className="mb-2 block text-xs font-semibold"
          >
            Efectivo entregado (opcional)
          </label>
          <NumericInput
            id="expense-cash-paid"
            name="cashPaid"
            value={cashPaid}
            onValueChange={setCashPaid}
            placeholder="0.00"
            maxLength={15}
            disabled={disabled}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Si pagaste exacto, déjalo vacío.
          </p>
          {change !== null && (
            <p
              className={`mt-1.5 text-xs ${change < 0 ? "text-destructive" : "text-muted-foreground"}`}
            >
              {change < 0
                ? "El efectivo entregado debe cubrir el importe."
                : `Vuelto recibido: ${formatMoney(change)}`}
            </p>
          )}
        </div>
      )}
      {canLinkShift && (
        <label className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-xs">
          <input
            type="checkbox"
            name="includeShift"
            value="true"
            defaultChecked={linkedToShift || canLinkShift}
            disabled={disabled}
            className="size-4 accent-primary"
          />
          Incluir en mi jornada actual
        </label>
      )}
    </div>
  );
}
