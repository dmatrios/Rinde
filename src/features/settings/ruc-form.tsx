"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { NumericInput } from "@/components/ui/numeric-input";
import { useToast } from "@/components/ui/toast";
import { updateRuc } from "@/features/settings/actions";
import { initialActionState } from "@/lib/auth/types";

export function RucForm({ ruc }: { ruc: string | null }) {
  const [open, setOpen] = useState(false);
  const [rucValue, setRucValue] = useState(ruc ?? "");
  const [state, action, pending] = useActionState(updateRuc, initialActionState);
  const previousState = useRef(initialActionState);
  const { toast } = useToast();

  useEffect(() => {
    if (!state.message || state === previousState.current) return;
    previousState.current = state;
    toast(state.message, state.status === "error" ? "error" : "success");
    if (state.status === "success") window.requestAnimationFrame(() => setOpen(false));
  }, [state, toast]);

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {ruc ?? "Aún no configuraste tu RUC."}
      </p>
      <Button type="button" size="sm" className="mt-5" onClick={() => setOpen(true)}>
        {ruc ? "Editar RUC" : "Configurar RUC"}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Tu RUC"
        description="Se usará sólo para identificar los gastos que registres con RUC."
      >
        <form action={action} className="space-y-5" aria-busy={pending}>
          <div>
            <label htmlFor="ruc" className="mb-2 block text-xs font-semibold">
              RUC
            </label>
            <NumericInput
              id="ruc"
              name="ruc"
              decimals={0}
              maxLength={11}
              value={rucValue}
              onValueChange={setRucValue}
              placeholder="11 dígitos"
              required
              disabled={pending}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              Guardar RUC
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
