"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ModalPopover } from "@/components/ui/modal-popover";
import { NumericInput } from "@/components/ui/numeric-input";
import { useToast } from "@/components/ui/toast";
import { initialActionState } from "@/lib/auth/types";
import { decimalToCents, formatMoney } from "@/lib/finance/money";
import { savePaymentReceipt } from "./actions";
import type { PaymentMethod, UserPlatform } from "@/types/database";

export function ReceiptModal({
  open,
  onOpenChange,
  platforms,
  shiftId = null,
  shiftPlatformId = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platforms: UserPlatform[];
  shiftId?: string | null;
  shiftPlatformId?: string | null;
}) {
  const [platformId, setPlatformId] = useState(shiftPlatformId ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [received, setReceived] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState(
    savePaymentReceipt,
    initialActionState,
  );
  const lastState = useRef(initialActionState);
  const { toast } = useToast();

  useEffect(() => {
    if (!state.message || state === lastState.current) return;
    lastState.current = state;
    toast(state.message, state.status === "error" ? "error" : "success");
    if (state.status === "success") onOpenChange(false);
  }, [state, toast, onOpenChange]);

  const change =
    method === "cash" && amount && received
      ? Math.max(0, decimalToCents(received) - decimalToCents(amount))
      : 0;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar cobro"
      description="Guarda lo que recibiste y cómo te pagaron."
    >
      <form action={action} className="space-y-5" aria-busy={pending}>
        <input type="hidden" name="shiftId" value={shiftId ?? ""} />
        <input
          type="hidden"
          name="platformId"
          value={shiftPlatformId ?? platformId}
        />
        {shiftPlatformId ? (
          <p className="rounded-xl bg-secondary px-3.5 py-3 text-sm">
            {platforms.find((platform) => platform.id === shiftPlatformId)
              ?.name ?? "Tu jornada"}
          </p>
        ) : (
          <div>
            <p className="mb-2 text-xs font-semibold">Plataforma</p>
            <button
              ref={triggerRef}
              type="button"
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              onClick={() => setPickerOpen(!pickerOpen)}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-card px-3.5 text-left text-sm"
            >
              {platforms.find((platform) => platform.id === platformId)?.name ??
                "Elige una plataforma"}
              <ChevronDown size={17} />
            </button>
            <ModalPopover
              anchorRef={triggerRef}
              open={pickerOpen}
              onOpenChange={setPickerOpen}
            >
              <div role="listbox" aria-label="Plataformas">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    role="option"
                    aria-selected={platform.id === platformId}
                    onClick={() => {
                      setPlatformId(platform.id);
                      setPickerOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted"
                  >
                    {platform.name}
                    {platform.id === platformId && <Check size={15} />}
                  </button>
                ))}
              </div>
            </ModalPopover>
          </div>
        )}
        <div>
          <label
            htmlFor="receipt-amount"
            className="mb-2 block text-xs font-semibold"
          >
            Importe cobrado
          </label>
          <NumericInput
            id="receipt-amount"
            name="amount"
            value={amount}
            onValueChange={setAmount}
            placeholder="0.00"
            maxLength={15}
            required
            disabled={pending}
          />
        </div>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold">Te pagaron con</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["cash", "Efectivo"],
                ["yape", "Yape"],
                ["plin", "Plin"],
                ["card", "Tarjeta"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={value}
                  checked={method === value}
                  onChange={() => setMethod(value)}
                  className="peer sr-only"
                  disabled={pending}
                />
                <span className="flex min-h-10 items-center justify-center rounded-xl border border-input text-xs font-medium peer-checked:border-primary peer-checked:bg-secondary peer-checked:text-primary">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {method === "cash" && (
          <div>
            <label
              htmlFor="receipt-cash"
              className="mb-2 block text-xs font-semibold"
            >
              Efectivo recibido
            </label>
            <NumericInput
              id="receipt-cash"
              name="cashReceived"
              value={received}
              onValueChange={setReceived}
              placeholder="0.00"
              maxLength={15}
              required
              disabled={pending}
            />
            {amount && received && (
              <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">
                Vuelto: <strong>{formatMoney(change)}</strong>
              </p>
            )}
          </div>
        )}
        <div>
          <label
            htmlFor="receipt-description"
            className="mb-2 block text-xs font-semibold"
          >
            Detalle (opcional)
          </label>
          <Input
            id="receipt-description"
            name="description"
            placeholder="Por ejemplo, pedido 123"
            maxLength={120}
            disabled={pending}
          />
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Si luego registras el total que muestra la plataforma, estos cobros no
          se sumarán dos veces.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={
              pending ||
              !(shiftPlatformId ?? platformId) ||
              !amount ||
              (method === "cash" &&
                (!received ||
                  decimalToCents(received) < decimalToCents(amount)))
            }
          >
            {pending ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : (
              "Guardar cobro"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
