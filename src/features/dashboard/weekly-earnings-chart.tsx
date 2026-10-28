"use client";

import { useState } from "react";
import { CirclePlus, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardEarningsSummary } from "@/features/earnings/queries";
import { formatMoney } from "@/lib/finance/money";

export function WeeklyEarningsChart({
  summary,
}: {
  summary: DashboardEarningsSummary;
}) {
  const highest = Math.max(
    ...summary.days.flatMap((day) => [day.grossCents, day.expensesCents]),
    0,
  );
  const mostRecent = summary.days.findLastIndex(
    (day) => day.grossCents || day.expensesCents,
  );
  const [selectedIndex, setSelectedIndex] = useState(
    mostRecent >= 0 ? mostRecent : summary.days.length - 1,
  );
  const selected = summary.days[selectedIndex];

  return (
    <Card className="h-full">
      <CardHeader className="flex items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wallet size={18} /> Tu avance
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Compara ingresos y gastos de cada día.
          </p>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
          Semana
        </span>
      </CardHeader>
      <CardContent>
        {highest ? (
          <>
            <div className="relative pt-24 sm:pt-15">
              {selected && <DashboardChartTooltip day={selected} />}
              <div
                className="grid grid-cols-7 gap-1.5"
                aria-label="Gráfica de ingresos y gastos de los últimos siete días"
              >
                {summary.days.map((day, index) => {
                  const incomeHeight = Math.max(
                    10,
                    Math.round((day.grossCents / highest) * 112),
                  );
                  const expenseHeight = Math.max(
                    10,
                    Math.round((day.expensesCents / highest) * 112),
                  );
                  return (
                    <button
                      key={day.date}
                      type="button"
                      aria-label={`${day.label}: ${formatMoney(day.grossCents)} de ingresos, ${formatMoney(day.expensesCents)} de gastos y ${day.orders || "sin detalle de pedidos"}`}
                      aria-pressed={selectedIndex === index}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onFocus={() => setSelectedIndex(index)}
                      onClick={() => setSelectedIndex(index)}
                      className="group flex min-w-0 flex-col items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <span className="mb-2 flex h-7 items-end text-center text-[9px] font-semibold leading-3 tabular-nums text-foreground sm:text-[10px]">
                        {formatCompactChartAmount(day.grossCents)}
                      </span>
                      <span className="flex h-28 w-full items-end justify-center gap-1 border-b border-border">
                        <span
                          className={`w-[52%] rounded-t-lg transition-all duration-300 ${day.grossCents ? (selectedIndex === index ? "bg-primary" : "bg-primary/75 group-hover:bg-primary/90") : "bg-muted-foreground/20 group-hover:bg-muted-foreground/35"}`}
                          style={{
                            height: `${day.grossCents ? incomeHeight : 8}px`,
                          }}
                        />
                        <span
                          className={`w-[36%] rounded-t-md transition-all duration-300 ${day.expensesCents ? (selectedIndex === index ? "bg-foreground/80" : "bg-muted-foreground/45 group-hover:bg-muted-foreground/65") : "bg-muted-foreground/15 group-hover:bg-muted-foreground/30"}`}
                          style={{
                            height: `${day.expensesCents ? expenseHeight : 6}px`,
                          }}
                        />
                      </span>
                      <span className="mt-2 text-[10px] font-medium text-muted-foreground">
                        {day.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <i className="size-2 rounded-sm bg-primary" /> Ingresos
              </span>
              <span className="flex items-center gap-2">
                <i className="size-2 rounded-sm bg-foreground/80" /> Gastos
              </span>
            </div>
          </>
        ) : (
          <div className="flex min-h-32 flex-col items-center justify-center text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <CirclePlus size={18} />
            </div>
            <p className="text-sm font-medium">
              Aún no hay movimientos esta semana.
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Cuando registres un ingreso o gasto, lo verás aquí.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardChartTooltip({
  day,
}: {
  day: DashboardEarningsSummary["days"][number];
}) {
  return (
    <div className="absolute right-0 top-0 z-10 rounded-xl border border-border bg-card px-3 py-2 text-right text-xs shadow-sm">
      <p className="font-semibold">{formatFullDay(day.date)}</p>
      <p className="mt-1 text-muted-foreground">
        Ingresos{" "}
        <strong className="text-foreground">
          {formatMoney(day.grossCents)}
        </strong>
      </p>
      <p className="text-muted-foreground">
        Gastos{" "}
        <strong className="text-foreground">
          {formatMoney(day.expensesCents)}
        </strong>
      </p>
      <p className="text-muted-foreground">
        Pedidos <strong className="text-foreground">{day.orders || "—"}</strong>
      </p>
    </div>
  );
}

function formatCompactChartAmount(cents: number) {
  const amount = cents / 100;
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: amount < 100 ? 2 : 0,
    notation: amount >= 10_000 ? "compact" : "standard",
  }).format(amount);
}

function formatFullDay(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
