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
  existingRecord = false,
  initialIncludeShift,
  onDraftChange,
  disabled = false,
}: {
  defaultMethod?: PaymentMethod | null;
  defaultCashPaid?: number | null;
  amount: string;
  canLinkShift: boolean;
  linkedToShift?: boolean;
  existingRecord?: boolean;
  initialIncludeShift?: boolean;
  onDraftChange?: (patch: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const [method, setMethod] = useState<PaymentMethod | null>(
    defaultMethod === undefined ? "cash" : defaultMethod,
  );
  const [cashPaid, setCashPaid] = useState(
    defaultCashPaid === null ? "" : String(defaultCashPaid),
  );
  const [includeShift, setIncludeShift] = useState(
    initialIncludeShift ?? (linkedToShift || (!existingRecord && canLinkShift)),
  );
  const change =
    cashPaid && amount
      ? decimalToCents(cashPaid) - decimalToCents(amount)
      : null;
  return (
    <div className="space-y-3">
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
                onChange={() => {
                  setMethod(value);
                  onDraftChange?.({ paymentMethod: value });
                }}
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
            onValueChange={(value) => {
              setCashPaid(value);
              onDraftChange?.({ cashPaid: value });
            }}
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
      {canLinkShift || linkedToShift ? (
        <fieldset>
          <legend className="mb-2 text-xs font-semibold">
            ¿Dónde registrarlo?
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: true, label: "En jornada" },
              { value: false, label: "Fuera de jornada" },
            ].map(({ value, label }) => (
              <label key={label} className="cursor-pointer">
                <input
                  className="peer sr-only"
                  type="radio"
                  name="includeShift"
                  value={String(value)}
                  checked={includeShift === value}
                  onChange={() => {
                    setIncludeShift(value);
                    onDraftChange?.({ includeShift: String(value) });
                  }}
                  disabled={disabled}
                />
                <span className="flex min-h-11 items-center justify-center rounded-xl border border-input px-2 text-center text-xs font-medium transition-colors peer-checked:border-primary peer-checked:bg-secondary peer-checked:text-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/25">
                  {label}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {includeShift
              ? linkedToShift && !canLinkShift
                ? "Se conservará la jornada de este registro."
                : "Si pagaste en efectivo, se descontará del saldo de tu jornada."
              : "Aparecerá en tus gastos y reportes, sin cambiar el saldo de tu jornada."}
          </p>
        </fieldset>
      ) : (
        <div className="rounded-xl border border-border bg-muted/35 px-3 py-2.5 text-xs text-muted-foreground">
          Se guardará fuera de jornada y aparecerá en tus gastos y reportes.
        </div>
      )}
    </div>
  );
}
