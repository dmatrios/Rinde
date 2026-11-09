"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, LoaderCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { correctShiftTime } from "@/features/shifts/actions";
import { initialActionState } from "@/lib/auth/types";
import type { WorkShift } from "@/types/database";

export function EditShiftTimeModal({ shift }: { shift: WorkShift }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const save = (form: FormData) => {
    startTransition(async () => {
      try {
        const result = await correctShiftTime(initialActionState, form);
        if (result.message)
          toast(
            result.message,
            result.status === "error" ? "error" : "success",
          );
        if (result.status === "success") setOpen(false);
      } catch {
        toast("No pudimos guardar las horas. Inténtalo nuevamente.", "error");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Pencil size={15} /> Corregir horas
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Corregir horarios"
        description="Revisa las horas de esta jornada antes de guardar."
      >
        <form action={save} className="space-y-5" aria-busy={pending}>
          <input type="hidden" name="shiftId" value={shift.id} />
          <div className="rounded-xl border border-primary/20 bg-secondary/60 p-3 text-sm leading-5">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={16} /> Antes de corregir
            </p>
            <p className="mt-1 text-muted-foreground">
              Cambiar estas horas modifica tu tiempo efectivo. La fecha y los
              horarios de las pausas permanecen iguales.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TimeField
              label="Inicio"
              name="startTime"
              value={shift.started_at}
              disabled={pending}
            />
            <TimeField
              label="Fin"
              name="endTime"
              value={shift.ended_at!}
              disabled={pending}
            />
          </div>
          <label className="flex items-start gap-2.5 text-xs leading-5">
            <input
              type="checkbox"
              name="confirmed"
              value="true"
              required
              disabled={pending}
              className="mt-0.5 size-4 accent-primary"
            />
            Revisé las horas y entiendo que cambiará el tiempo efectivo.
          </label>
          <div className="flex justify-end gap-2">
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
              disabled={pending}
              className="relative"
            >
              <span className={pending ? "invisible" : ""}>Guardar horas</span>
              {pending && (
                <LoaderCircle className="absolute animate-spin" size={17} />
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function TimeField({
  label,
  name,
  value,
  disabled,
}: {
  label: string;
  name: string;
  value: string;
  disabled: boolean;
}) {
  const date = new Date(value);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Lima",
  }).format(date);
  const day = new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Lima",
  }).format(date);
  return (
    <label className="block text-xs font-semibold">
      {label} · {day}
      <input
        type="time"
        name={name}
        defaultValue={time}
        required
        disabled={disabled}
        className="mt-2 flex h-12 w-full rounded-xl border border-input bg-card px-3 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15"
      />
    </label>
  );
}
