"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { linkReceiptToShift } from "@/features/movements/actions";
import { initialActionState } from "@/lib/auth/types";
import type { WorkShift } from "@/types/database";

type ShiftChoice = Pick<WorkShift, "id" | "started_at" | "ended_at">;

export function LinkReceiptToShift({ receiptId, shifts }: { receiptId: string; shifts: ShiftChoice[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visibleShifts = showAll ? shifts : shifts.slice(0, 5);

  function associate(shiftId: string) {
    setSelectedId(shiftId);
    const form = new FormData();
    form.set("receiptId", receiptId);
    form.set("shiftId", shiftId);
    startTransition(async () => {
      try {
        const result = await linkReceiptToShift(initialActionState, form);
        if (result.message) toast(result.message, result.status === "error" ? "error" : "success");
        if (result.status === "success") router.refresh();
      } catch {
        toast("No pudimos asociar el cobro. Inténtalo otra vez.", "error");
      } finally {
        setSelectedId(null);
      }
    });
  }

  if (!shifts.length) {
    return <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">Aún no tienes jornadas finalizadas de esta plataforma.</p>;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold">Elegir jornada</h3>
      <ul className="mt-3 max-h-96 divide-y divide-border overflow-y-auto rounded-2xl border border-border">
        {visibleShifts.map((shift) => (
          <li key={shift.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{formatShiftDate(shift.started_at)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatTime(shift.started_at)} a {shift.ended_at ? formatTime(shift.ended_at) : "En curso"}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => associate(shift.id)}>
              {pending && selectedId === shift.id ? <LoaderCircle size={15} className="animate-spin" /> : <ArrowRight size={15} />}
              Asociar
            </Button>
          </li>
        ))}
      </ul>
      {!showAll && shifts.length > visibleShifts.length && (
        <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setShowAll(true)}>
          Mostrar más jornadas
        </Button>
      )}
    </div>
  );
}

function formatShiftDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "full", timeZone: "America/Lima" }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", { timeStyle: "short", timeZone: "America/Lima" }).format(new Date(value));
}
