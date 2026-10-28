"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { deleteOwnAccount } from "@/features/auth/actions";
import { initialActionState } from "@/lib/auth/types";

export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    deleteOwnAccount,
    initialActionState,
  );
  const lastState = useRef(initialActionState);
  const { toast } = useToast();
  useEffect(() => {
    if (!state.message || state === lastState.current) return;
    lastState.current = state;
    toast(state.message, "error");
  }, [state, toast]);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 />
        Eliminar cuenta
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Eliminar cuenta"
        description="Esta acción eliminará tu perfil y todos tus registros. No se puede deshacer."
      >
        <form action={action} className="space-y-5" aria-busy={pending}>
          <div>
            <label
              htmlFor="delete-confirmation"
              className="mb-2 block text-xs font-semibold"
            >
              Escribe ELIMINAR para continuar
            </label>
            <Input
              id="delete-confirmation"
              name="confirmation"
              autoComplete="off"
              disabled={pending}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-destructive hover:bg-destructive/90"
              disabled={pending}
            >
              Eliminar definitivamente
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
