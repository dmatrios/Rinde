"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { NumericInput } from "@/components/ui/numeric-input";
import { useToast } from "@/components/ui/toast";
import { saveCashCount } from "@/features/shifts/actions";
import { initialActionState } from "@/lib/auth/types";
import { decimalToCents, formatMoney } from "@/lib/finance/money";

export function CashCountModal({
  shiftId,
  expectedCents,
  countedCash,
  openOnLoad = false,
}: {
  shiftId: string;
  expectedCents: number;
  countedCash: number | null;
  openOnLoad?: boolean;
}) {
  const [open, setOpen] = useState(openOnLoad);
  const [amount, setAmount] = useState(
    countedCash === null ? "" : String(countedCash),
  );
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const difference = amount ? decimalToCents(amount) - expectedCents : null;

  const save = (form: FormData) => {
    startTransition(async () => {
      try {
        const result = await saveCashCount(initialActionState, form);
        if (result.message)
          toast(
            result.message,
            result.status === "error" ? "error" : "success",
          );
        if (result.status === "success") setOpen(false);
      } catch {
        toast("No pudimos guardar el arqueo. Inténtalo de nuevo.", "error");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <Wallet size={16} />{" "}
        {countedCash === null ? "Contar efectivo" : "Editar arqueo"}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Cierre de efectivo"
        description="Cuenta el dinero que tienes y compáralo con tus movimientos."
      >
        <form action={save} className="space-y-5" aria-busy={pending}>
          <input type="hidden" name="shiftId" value={shiftId} />
          <div className="rounded-xl bg-secondary px-4 py-3 text-sm">
            Efectivo esperado: <strong>{formatMoney(expectedCents)}</strong>
          </div>
          <div>
            <label
              htmlFor="cash-counted"
              className="mb-2 block text-xs font-semibold"
            >
              Efectivo que tienes
            </label>
            <NumericInput
              id="cash-counted"
              name="countedCash"
              value={amount}
              onValueChange={setAmount}
              placeholder="0.00"
              maxLength={15}
              required
              disabled={pending}
            />
          </div>
          {difference !== null && (
            <p className="rounded-xl border border-border px-4 py-3 text-sm">
              Diferencia: <strong>{formatMoney(difference)}</strong>
            </p>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            El arqueo sirve para revisar tu efectivo. No modifica los ingresos
            ni los gastos registrados.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending || !amount}>
              {pending ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                "Guardar arqueo"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
