"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Pencil, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { NumericInput } from "@/components/ui/numeric-input";
import { useToast } from "@/components/ui/toast";
import { removeWeeklyGoal, saveWeeklyGoal } from "@/features/reports/actions";
import { initialActionState } from "@/lib/auth/types";
import { decimalToCents, formatMoney } from "@/lib/finance/money";

export function WeeklyGoal({
  goal,
  incomeCents,
}: {
  goal: number | null;
  incomeCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(goal === null ? "" : String(goal));
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const goalCents = goal === null ? null : decimalToCents(goal);
  const progress = goalCents
    ? Math.min(100, Math.round((incomeCents / goalCents) * 100))
    : 0;

  const save = (form: FormData) => {
    startTransition(async () => {
      try {
        const result = await saveWeeklyGoal(initialActionState, form);
        if (result.message)
          toast(
            result.message,
            result.status === "error" ? "error" : "success",
          );
        if (result.status === "success") setOpen(false);
      } catch {
        toast("No pudimos guardar la meta.", "error");
      }
    });
  };
  const remove = () => {
    startTransition(async () => {
      try {
        const result = await removeWeeklyGoal();
        if (result.message)
          toast(
            result.message,
            result.status === "error" ? "error" : "success",
          );
        if (result.status === "success") setOpen(false);
      } catch {
        toast("No pudimos quitar la meta.", "error");
      }
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Target size={18} /> Meta semanal
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Tu avance según los ingresos registrados.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
        >
          {goalCents ? <Pencil size={15} /> : <Target size={15} />}
          {goalCents ? "Cambiar" : "Crear meta"}
        </Button>
      </div>
      {goalCents ? (
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <strong>{formatMoney(incomeCents)}</strong>
            <span className="text-muted-foreground">
              de {formatMoney(goalCents)}
            </span>
          </div>
          <div
            className="mt-2 h-3 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Avance de la meta semanal"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {progress}% de tu meta
          </p>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          Elige un importe para seguir tu avance cada semana.
        </p>
      )}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Meta semanal"
        description="Elige cuánto quieres ingresar por semana."
      >
        <form action={save} className="space-y-5" aria-busy={pending}>
          <div>
            <label
              htmlFor="weekly-goal"
              className="mb-2 block text-xs font-semibold"
            >
              Importe
            </label>
            <NumericInput
              id="weekly-goal"
              name="weeklyGoal"
              value={amount}
              onValueChange={setAmount}
              placeholder="0.00"
              maxLength={15}
              required
              disabled={pending}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Puedes cambiar o quitar esta meta cuando quieras.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {goalCents && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={remove}
                disabled={pending}
              >
                Quitar meta
              </Button>
            )}
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
                "Guardar meta"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
