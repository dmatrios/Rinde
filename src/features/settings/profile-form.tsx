"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateProfile } from "@/features/auth/actions";
import { initialActionState } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(
    updateProfile,
    initialActionState,
  );
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const lastState = useRef(initialActionState);

  useEffect(() => {
    if (!state.message || state === lastState.current) return;
    lastState.current = state;
    toast(state.message, state.status === "error" ? "error" : "success");
    if (state.status === "success") {
      window.requestAnimationFrame(() => setOpen(false));
    }
  }, [state, toast]);

  return (
    <div>
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="mb-1 text-xs font-semibold">Nombre</dt>
          <dd>{name}</dd>
        </div>
        <div>
          <dt className="mb-1 text-xs font-semibold">Correo electrónico</dt>
          <dd className="break-all text-muted-foreground">{email}</dd>
        </div>
      </dl>
      <Button
        type="button"
        size="sm"
        className="mt-5"
        onClick={() => setOpen(true)}
      >
        Editar perfil
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Editar perfil"
        description="Este nombre se verá únicamente en tu espacio personal."
      >
        <form action={action} aria-busy={pending} className="space-y-5">
          <div>
            <label
              htmlFor="displayName"
              className="mb-2 block text-xs font-semibold"
            >
              Nombre
            </label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={name}
              required
              minLength={2}
              maxLength={80}
              autoComplete="given-name"
            />
          </div>
          <div>
            <span className="mb-2 block text-xs font-semibold">
              Correo electrónico
            </span>
            <p className="break-all rounded-xl bg-background p-3 text-sm text-muted-foreground">
              {email}
            </p>
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
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
