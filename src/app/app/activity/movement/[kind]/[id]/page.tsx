import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, CreditCard, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkReceiptToShift } from "@/features/movements/link-receipt-to-shift";
import { getMovementDetail } from "@/features/movements/detail-query";
import { formatMoney } from "@/lib/finance/money";

export const metadata = { title: "Detalle de movimiento" };

const labels = {
  receipt: "Cobro",
  earning: "Ingreso total",
  expense: "Gasto",
  fuel: "Recarga",
} as const;
const methods = {
  cash: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
} as const;

export default async function MovementDetailPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  const movement = await getMovementDetail(kind, id);
  if (!movement) notFound();
  const outgoing = movement.kind === "expense" || movement.kind === "fuel";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/app/activity"><ArrowLeft size={16} /> Volver a Actividad</Link>
      </Button>

      <header className="rounded-3xl border border-border bg-card p-5 shadow-xs sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold text-primary">
              <ReceiptText size={16} /> {labels[movement.kind]}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {movement.title}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays size={16} /> {formatDateTime(movement.occurredAt)}
            </p>
          </div>
          <p className={`tabular-nums text-3xl font-bold sm:text-4xl ${outgoing ? "text-foreground" : "text-primary"}`}>
            {outgoing ? "−" : "+"}{formatMoney(movement.cents)}
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
        <Card className="h-fit">
          <CardHeader><CardTitle>Datos del movimiento</CardTitle></CardHeader>
          <CardContent className="space-y-0">
            {movement.rows.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
            {movement.method && (
              <DetailRow label="Método de pago" value={methods[movement.method]} />
            )}
            {movement.cashAmountCents !== null && (
              <>
                <DetailRow
                  label={movement.kind === "receipt" ? "Efectivo recibido" : "Efectivo entregado"}
                  value={formatMoney(movement.cashAmountCents)}
                />
                <DetailRow
                  label="Vuelto"
                  value={formatMoney(movement.cashAmountCents - movement.cents)}
                />
              </>
            )}
            {movement.description && (
              <DetailRow label="Detalle" value={movement.description} />
            )}
            {movement.kind === "receipt" && (
              <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-xs leading-5 text-secondary-foreground">
                Este cobro corresponde a un pedido. Se muestra aparte de lo que ganaste en tu jornada.
              </p>
            )}
            {movement.editHref && (
              <Button asChild variant="outline" size="sm" className="mt-5">
                <Link href={movement.editHref}>
                  {movement.kind === "earning" ? "Ver ingresos" : "Editar registro"}
                  <ArrowUpRight size={15} />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard size={18} /> Jornada</CardTitle>
          </CardHeader>
          <CardContent>
            {movement.shift ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Asociado a esta jornada</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  {formatShiftRange(movement.shift.started_at, movement.shift.ended_at)}
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/app/activity/${movement.shift.id}`}>
                    Ver jornada <ArrowUpRight size={15} />
                  </Link>
                </Button>
              </div>
            ) : movement.kind === "receipt" ? (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  Este cobro no tiene una jornada asociada. Elige una de la misma
                  plataforma si corresponde a tu turno, aunque lo hayas anotado después.
                </p>
                <LinkReceiptToShift receiptId={movement.id} shifts={movement.candidates} />
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                {movement.kind === "earning"
                  ? "Este ingreso está registrado por día. Puedes revisarlo desde Ingresos."
                  : "Este movimiento está fuera de una jornada."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-3 text-sm last:border-b-0 first:pt-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-full break-words text-right font-medium">{value}</span>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "full", timeStyle: "short", timeZone: "America/Lima",
  }).format(new Date(value));
}

function formatShiftRange(start: string, end: string | null) {
  return `${formatDateTime(start)} → ${end ? formatDateTime(end) : "En curso"}`;
}
