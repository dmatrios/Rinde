import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, Pencil, Route, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CashCountModal } from "@/features/shifts/cash-count-modal";
import { EditShiftTimeModal } from "@/features/shifts/edit-shift-time-modal";
import { getShiftDetail } from "@/features/shifts/detail-query";
import { formatMoney, decimalToCents } from "@/lib/finance/money";

export const metadata = { title: "Detalle de jornada" };

export default async function ShiftDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cash?: string }>;
}) {
  const { id } = await params;
  const { cash } = await searchParams;
  const detail = await getShiftDetail(id);
  if (!detail) notFound();
  const { shift, platform, pauses, movements } = detail;
  const end = shift.ended_at ? new Date(shift.ended_at) : new Date();
  const pauseMs = pauses.reduce(
    (total, pause) =>
      total +
      (new Date(pause.ended_at ?? end).getTime() -
        new Date(pause.started_at).getTime()),
    0,
  );
  const effectiveMinutes = Math.max(
    0,
    Math.floor(
      (end.getTime() - new Date(shift.started_at).getTime() - pauseMs) / 60_000,
    ),
  );

  return (
    <div className="max-w-5xl space-y-5 pb-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/app/activity">
          <ArrowLeft size={16} /> Volver a Actividad
        </Link>
      </Button>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Detalle de jornada</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {platform.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatDate(shift.started_at)}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          {shift.status === "completed"
            ? "Finalizada"
            : shift.status === "paused"
              ? "En pausa"
              : "En curso"}
        </span>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Summary
          label="Tiempo efectivo"
          value={formatDuration(effectiveMinutes)}
          icon={<Clock3 size={18} />}
        />
        <Summary
          label="Ingresos"
          value={formatMoney(detail.grossCents)}
          icon={<Wallet size={18} />}
        />
        <Summary
          label="Gastos"
          value={formatMoney(detail.expensesCents)}
          icon={<Route size={18} />}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.75fr)]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Horarios</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Tus pausas se descuentan del tiempo efectivo.
              </p>
            </div>
            {shift.status === "completed" && shift.ended_at && (
              <EditShiftTimeModal shift={shift} />
            )}
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <TimeRow label="Inicio" value={formatDateTime(shift.started_at)} />
            <TimeRow
              label="Fin"
              value={
                shift.ended_at ? formatDateTime(shift.ended_at) : "En curso"
              }
            />
            <div className="border-t border-border pt-4">
              <p className="mb-3 text-xs font-semibold">
                Pausas ({pauses.length})
              </p>
              {pauses.length ? (
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {pauses.map((pause) => (
                    <li key={pause.id} className="flex justify-between gap-3">
                      <span>{formatDateTime(pause.started_at)}</span>
                      <span>
                        {pause.ended_at
                          ? formatDateTime(pause.ended_at)
                          : "En curso"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sin pausas registradas.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tu balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <TimeRow label="Ingresos" value={formatMoney(detail.grossCents)} />
            <TimeRow label="Gastos" value={formatMoney(detail.expensesCents)} />
            <TimeRow
              label="Resultado"
              value={formatMoney(detail.grossCents - detail.expensesCents)}
              strong
            />
            <div className="border-t border-border pt-4">
              <TimeRow
                label="Efectivo inicial"
                value={formatMoney(decimalToCents(shift.opening_cash))}
              />
            </div>
            <TimeRow
              label="Efectivo en caja"
              value={formatMoney(decimalToCents(detail.cashBalance))}
            />
            {shift.status === "completed" && (
              <div className="space-y-3 border-t border-border pt-4">
                {shift.cash_counted != null && (
                  <>
                    <TimeRow
                      label="Efectivo contado"
                      value={formatMoney(decimalToCents(shift.cash_counted))}
                    />
                    <TimeRow
                      label="Diferencia"
                      value={formatMoney(
                        decimalToCents(shift.cash_counted) -
                          decimalToCents(detail.cashBalance),
                      )}
                      strong
                    />
                  </>
                )}
                <CashCountModal
                  key={String(shift.cash_counted)}
                  shiftId={shift.id}
                  expectedCents={decimalToCents(detail.cashBalance)}
                  countedCash={shift.cash_counted ?? null}
                  openOnLoad={cash === "1" && shift.cash_counted == null}
                />
              </div>
            )}
            {detail.orders > 0 && (
              <TimeRow label="Pedidos" value={String(detail.orders)} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos de esta jornada</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Puedes corregir un gasto desde su detalle.
          </p>
        </CardHeader>
        <CardContent>
          {movements.length ? (
            <ul className="divide-y divide-border">
              {movements.map((movement) => (
                <li
                  key={`${movement.kind}-${movement.id}`}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {movement.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(movement.occurredAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {movement.kind === "receipt" ? "+" : "−"}
                      {formatMoney(movement.cents)}
                    </span>
                    {movement.editHref && (
                      <Button asChild size="sm" variant="ghost">
                        <Link
                          href={movement.editHref}
                          aria-label={`Editar ${movement.title}`}
                        >
                          <Pencil size={15} />
                        </Link>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aún no hay movimientos vinculados a esta jornada.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
function TimeRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          strong ? "font-bold tabular-nums" : "font-medium tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "full",
    timeZone: "America/Lima",
  }).format(new Date(value));
}
function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}
