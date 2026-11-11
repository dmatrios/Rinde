"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, PartyPopper, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { NumericInput } from "@/components/ui/numeric-input";
import { useToast } from "@/components/ui/toast";
import { saveShiftCloseIncome } from "@/features/earnings/actions";
import { linkReceiptToShift } from "@/features/movements/actions";
import { initialActionState } from "@/lib/auth/types";
import { formatLimaTime } from "@/lib/format/lima-time";
import { decimalToCents, formatMoney } from "@/lib/finance/money";
import type { PaymentMethod, PaymentReceipt } from "@/types/database";

const CONFETTI = Array.from({ length: 18 }, (_, index) => ({
  left: `${6 + ((index * 37) % 88)}%`,
  delay: `${(index * 83) % 650}ms`,
  color: ["#d4481a", "#f0b84f", "#325b65", "#e9917c"][index % 4],
}));
const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
};

export function ShiftFinishFlow({
  shiftId,
  distanceKm,
  savedIncomeCents,
  cashLimitCents,
  hasDailyEarning,
  linkedReceipts,
  unlinkedReceipts,
  openOnLoad,
}: {
  shiftId: string;
  distanceKm: number | null;
  savedIncomeCents: number | null;
  cashLimitCents: number | null;
  hasDailyEarning: boolean;
  linkedReceipts: PaymentReceipt[];
  unlinkedReceipts: PaymentReceipt[];
  openOnLoad: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [phase, setPhase] = useState<"ask" | "celebrate" | null>(
    openOnLoad ? (savedIncomeCents === null ? "ask" : "celebrate") : null,
  );
  const [amount, setAmount] = useState("");
  const [displayIncomeCents, setDisplayIncomeCents] = useState<number | null>(
    savedIncomeCents,
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [linkPending, startLinkTransition] = useTransition();
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [justLinked, setJustLinked] = useState<string[]>([]);
  const newlyLinked = unlinkedReceipts.filter((receipt) =>
    justLinked.includes(receipt.id),
  );
  const visibleUnlinked = unlinkedReceipts.filter(
    (receipt) => !justLinked.includes(receipt.id),
  );
  const visibleLinked = [...linkedReceipts, ...newlyLinked];
  const linkedTotalCents = visibleLinked.reduce(
    (sum, receipt) => sum + decimalToCents(receipt.amount),
    0,
  );
  const cashCollectedCents = visibleLinked
    .filter((receipt) => receipt.payment_method === "cash")
    .reduce((sum, receipt) => sum + decimalToCents(receipt.amount), 0);
  const cashExcessCents = cashLimitCents === null
    ? null
    : Math.max(0, cashCollectedCents - cashLimitCents);

  const linkReceipt = (receiptId: string) => {
    setLinkingId(receiptId);
    const form = new FormData();
    form.set("receiptId", receiptId);
    form.set("shiftId", shiftId);
    startLinkTransition(async () => {
      try {
        const result = await linkReceiptToShift(initialActionState, form);
        if (result.status === "success") {
          setJustLinked((current) => [...current, receiptId]);
          router.refresh();
        }
        toast(
          result.message ?? "No pudimos asociar el cobro.",
          result.status === "success" ? "success" : "error",
        );
      } catch {
        toast("No pudimos asociar el cobro. Inténtalo otra vez.", "error");
      } finally {
        setLinkingId(null);
      }
    });
  };

  const close = () => {
    if (pending) return;
    if (phase === "ask" && openOnLoad) {
      setDisplayIncomeCents(null);
      setPhase("celebrate");
      return;
    }
    setPhase(null);
    if (openOnLoad) router.replace(`/app/activity/${shiftId}`, { scroll: false });
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData();
    form.set("shiftId", shiftId);
    form.set("reportedAmount", amount);
    startTransition(async () => {
      try {
        const result = await saveShiftCloseIncome(initialActionState, form);
        if (result.status !== "success") {
          setError(result.message ?? "No pudimos guardar el ingreso.");
          return;
        }
        setDisplayIncomeCents(decimalToCents(amount));
        setPhase("celebrate");
      } catch {
        setError("No pudimos guardar el ingreso. Inténtalo de nuevo.");
      }
    });
  };

  return (
    <>
      {savedIncomeCents === null && displayIncomeCents === null && !hasDailyEarning && (
        <Button type="button" variant="outline" size="sm" onClick={() => setPhase("ask")}>
          <Plus size={16} /> Agregar ingreso de esta jornada
        </Button>
      )}
      {savedIncomeCents === null && hasDailyEarning && (
        <p className="text-xs text-muted-foreground">
          Ya tienes un ingreso por día para esta plataforma. Puedes revisarlo en{" "}
          <Link href="/app/earnings" className="font-semibold text-primary underline underline-offset-2">
            Ingresos
          </Link>
          .
        </p>
      )}
      {phase === null && visibleUnlinked.length > 0 && (
        <ReceiptLinkList
          receipts={visibleUnlinked}
          linkingId={linkingId}
          pending={linkPending}
          onLink={linkReceipt}
        />
      )}
      <Modal
        open={phase !== null}
        onOpenChange={(open) => !open && close()}
        title={phase === "celebrate" ? "¡Jornada terminada!" : "¿Cuánto hiciste en esta jornada?"}
        description={
          phase === "celebrate"
            ? "Tu trabajo de hoy ya quedó registrado."
            : "Anota el total que muestra tu plataforma. También puedes hacerlo después."
        }
      >
        {phase === "ask" ? (
          hasDailyEarning ? (
            <div className="space-y-5">
              <p className="text-sm leading-6 text-muted-foreground">
                Ya registraste un total por día para esta plataforma. Así evitas
                contar el mismo ingreso dos veces.
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button asChild type="button" variant="outline" size="sm">
                  <Link href="/app/earnings">Ver ingresos</Link>
                </Button>
                <Button type="button" size="sm" onClick={() => setPhase("celebrate")}>
                  Continuar
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={save} className="space-y-5" aria-busy={pending}>
              <div className="rounded-xl border border-border bg-muted/35 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xs font-semibold">Cobros de pedidos de esta jornada</p>
                  <strong className="text-sm tabular-nums">
                    {formatMoney(linkedTotalCents)}
                  </strong>
                </div>
                {visibleLinked.length ? (
                  <ul className="mt-3 space-y-2 border-t border-border pt-3 text-xs">
                    {Object.entries(METHOD_LABELS).map(([method, label]) => {
                      const total = visibleLinked
                        .filter((receipt) => receipt.payment_method === method)
                        .reduce((sum, receipt) => sum + decimalToCents(receipt.amount), 0);
                      return total > 0 ? (
                        <li key={method} className="flex justify-between gap-3">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-semibold tabular-nums">{formatMoney(total)}</span>
                        </li>
                      ) : null;
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Aún no hay cobros asociados a este turno.
                  </p>
                )}
                {cashLimitCents !== null && (
                  <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Límite de efectivo</span>
                      <span className="tabular-nums">{formatMoney(cashLimitCents)}</span>
                    </div>
                    <div className="flex justify-between gap-3 font-semibold">
                      <span>Excedente de efectivo</span>
                      <span className="tabular-nums">{formatMoney(cashExcessCents ?? 0)}</span>
                    </div>
                  </div>
                )}
              </div>
              {visibleUnlinked.length > 0 && (
                <ReceiptLinkList
                  receipts={visibleUnlinked}
                  linkingId={linkingId}
                  pending={linkPending}
                  onLink={linkReceipt}
                />
              )}
              <div>
                <label htmlFor="finish-income" className="mb-2 block text-xs font-semibold">
                  Ganancia del turno
                </label>
                <div className="relative">
                  <Wallet size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <NumericInput
                    id="finish-income"
                    value={amount}
                    onValueChange={setAmount}
                    placeholder="0.00"
                    maxLength={15}
                    required
                    disabled={pending}
                    className="pl-10"
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Escribe lo que ganaste según tu plataforma. Los cobros de pedidos
                  son dinero recibido de clientes y pueden superar tu ganancia.
                </p>
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => {
                  setDisplayIncomeCents(null);
                  setPhase("celebrate");
                }}>
                  Agregar más tarde
                </Button>
                <Button type="submit" size="sm" disabled={pending || linkPending || !amount}>
                  {pending ? <LoaderCircle size={17} className="animate-spin" aria-label="Guardando" /> : "Guardar y continuar"}
                </Button>
              </div>
            </form>
          )
        ) : phase === "celebrate" ? (
          <div className="space-y-5">
            <div className="relative flex min-h-40 flex-col items-center justify-center overflow-hidden rounded-2xl bg-secondary px-5 py-6 text-center">
              {CONFETTI.map((piece, index) => (
                <span
                  key={index}
                  aria-hidden="true"
                  className="shift-confetti absolute top-0 h-2.5 w-1.5 rounded-sm"
                  style={{ left: piece.left, backgroundColor: piece.color, animationDelay: piece.delay }}
                />
              ))}
              <div className="relative z-10 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <PartyPopper size={23} />
              </div>
              <p className="relative z-10 mt-3 text-xl font-bold">¡Buen trabajo!</p>
              <p className="relative z-10 mt-1 max-w-xs text-sm text-muted-foreground">
                Cada jornada cuenta. Tómate un respiro; mañana seguimos.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Hiciste en esta jornada</p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {displayIncomeCents !== null
                    ? formatMoney(displayIncomeCents)
                    : hasDailyEarning
                      ? "Registrado por día"
                      : "Por registrar"}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Recorriste</p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {distanceKm === null ? "Sin lectura de km" : `${formatDistance(distanceKm)} km`}
                </p>
              </div>
            </div>
            {displayIncomeCents === null && !hasDailyEarning && (
              <p className="text-xs text-muted-foreground">
                Podrás agregar el ingreso desde el detalle de esta jornada.
              </p>
            )}
            <Button type="button" className="w-full" onClick={close}>Ver mi jornada</Button>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function ReceiptLinkList({
  receipts,
  linkingId,
  pending,
  onLink,
}: {
  receipts: PaymentReceipt[];
  linkingId: string | null;
  pending: boolean;
  onLink: (receiptId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-secondary/50 p-4">
      <p className="text-xs font-semibold">Cobros sin jornada de este horario</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Asócialos si pertenecen a este turno. Se mostrarán aparte de tu ganancia.
      </p>
      <ul className="mt-3 divide-y divide-border/70">
        {receipts.map((receipt) => (
          <li key={receipt.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0 text-xs">
              <p className="font-semibold tabular-nums">
                {formatMoney(decimalToCents(receipt.amount))} · {METHOD_LABELS[receipt.payment_method]}
              </p>
              <p className="mt-1 truncate text-muted-foreground">
                {formatLimaTime(receipt.occurred_at)}
                {receipt.description ? ` · ${receipt.description}` : ""}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => onLink(receipt.id)}
              aria-label={`Asociar cobro de ${formatMoney(decimalToCents(receipt.amount))}`}
            >
              {linkingId === receipt.id ? <LoaderCircle size={16} className="animate-spin" /> : "Asociar"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDistance(value: number) {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(value);
}
