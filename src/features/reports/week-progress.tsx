"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { formatMoney } from "@/lib/finance/money";
import type { ReportPeriod } from "@/features/reports/report-math";
import type { WeeklyProductivity } from "@/features/reports/productivity";
import { WeeklyGoal } from "@/features/reports/weekly-goal";

export function WeekProgress({
  report,
  loading,
  nextDisabled,
  onNext,
  onPrevious,
  weeklyGoal,
  productivity,
}: {
  report: ReportPeriod;
  loading: boolean;
  nextDisabled: boolean;
  onNext: () => void;
  onPrevious: () => void;
  weeklyGoal: number | null;
  productivity: WeeklyProductivity;
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const income = report.metrics.grossCents;
  const expenses =
    report.metrics.operationalCents + report.metrics.personalCents;
  const maximum = Math.max(income, expenses, 1);
  const dayMaximum = Math.max(
    ...report.daily.flatMap((day) => [
      day.grossCents,
      day.operationalCents + day.personalCents + day.fuelCents,
    ]),
    1,
  );

  return (
    <div className="space-y-5">
      <nav
        aria-label="Elegir semana"
        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:p-4"
      >
        <button
          type="button"
          aria-label="Semana anterior"
          onClick={onPrevious}
          disabled={loading}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 text-center" aria-live="polite">
          <p className="text-[11px] font-medium text-muted-foreground">
            Semana elegida
          </p>
          <p className="text-sm font-semibold sm:text-base">
            {loading ? (
              <LoaderCircle
                size={18}
                className="mx-auto animate-spin"
                aria-label="Cargando semana"
              />
            ) : (
              `${formatShortDate(report.startDate)} – ${formatShortDate(report.endDate)}`
            )}
          </p>
        </div>
        <button
          type="button"
          aria-label="Semana siguiente"
          onClick={onNext}
          disabled={loading || nextDisabled}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </nav>
      <section className="rounded-3xl bg-foreground p-6 text-background sm:p-8">
        <div className="flex items-center gap-2 text-xs text-background/70">
          <CalendarDays size={16} /> Tu semana
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          {formatMoney(report.metrics.remainingCents)}
        </h2>
        <p className="mt-1 text-sm text-background/70">
          Lo que queda después de tus gastos registrados.
        </p>
        <p className="mt-5 text-xs text-background/60">
          Del {formatShortDate(report.startDate)} al{" "}
          {formatShortDate(report.endDate)}
        </p>
      </section>

      <WeeklyGoal
        key={String(weeklyGoal)}
        goal={weeklyGoal}
        incomeCents={income}
      />

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">
            Resultado operativo por hora
          </p>
          <p className="mt-2 text-xl font-bold tabular-nums">
            {productivity.hourlyCents === null
              ? "—"
              : `${formatMoney(productivity.hourlyCents)} / h`}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {productivity.shiftsWithTime
              ? `${productivity.shiftsWithTime} jornada${productivity.shiftsWithTime === 1 ? "" : "s"} finalizada${productivity.shiftsWithTime === 1 ? "" : "s"} con ingresos; sin contar pausas.`
              : "Aparecerá cuando una jornada finalizada tenga ingresos registrados."}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">
            Resultado operativo por kilómetro
          </p>
          <p className="mt-2 text-xl font-bold tabular-nums">
            {productivity.perKmCents === null
              ? "—"
              : `${formatMoney(productivity.perKmCents)} / km`}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {productivity.shiftsWithDistance
              ? `${productivity.kilometers.toFixed(1)} km de ${productivity.shiftsWithDistance} jornada${productivity.shiftsWithDistance === 1 ? "" : "s"} con lecturas completas.`
              : "Aparecerá al registrar kilometraje de inicio, pausas y fin."}
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
          <h3 className="font-semibold">Ingresos frente a gastos</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Compara lo que ingresó con lo que pagaste esta semana.
          </p>
          <div className="mt-7 space-y-6">
            <ComparisonBar
              label="Ingresos"
              amount={income}
              maximum={maximum}
              tone="income"
            />
            <ComparisonBar
              label="Gastos"
              amount={expenses}
              maximum={maximum}
              tone="expense"
            />
          </div>
          <p className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            Los gastos incluyen los operativos, personales y recargas que
            registraste.
          </p>
        </div>

        <div className="relative rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
          <h3 className="font-semibold">Día a día</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Ingresos y gastos de la semana.
          </p>
          <div className="mt-6 flex h-40 items-end gap-2">
            {report.daily.map((day, index) => {
              const spent =
                day.operationalCents + day.personalCents + day.fuelCents;
              return (
                <button
                  key={day.date}
                  type="button"
                  onMouseEnter={() => setSelectedDay(index)}
                  onFocus={() => setSelectedDay(index)}
                  onClick={() => setSelectedDay(index)}
                  aria-label={`${formatFullDate(day.date)}: ingresos ${formatMoney(day.grossCents)}, gastos ${formatMoney(spent)}`}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex h-28 w-full items-end justify-center gap-1">
                    <div
                      className="w-[38%] min-w-1 rounded-t-md bg-primary"
                      style={{
                        height: `${Math.max(4, (day.grossCents / dayMaximum) * 100)}%`,
                      }}
                    />
                    <div
                      className="w-[38%] min-w-1 rounded-t-md bg-foreground/65"
                      style={{
                        height: `${Math.max(4, (spent / dayMaximum) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {formatWeekday(day.date)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {day.label}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedDay !== null && report.daily[selectedDay] && (
            <div className="pointer-events-none absolute right-4 top-16 z-10 rounded-xl border border-border bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
              <p className="font-semibold">
                {formatFullDate(report.daily[selectedDay].date)}
              </p>
              <p className="mt-1">
                Ingresos {formatMoney(report.daily[selectedDay].grossCents)}
              </p>
              <p>
                Gastos{" "}
                {formatMoney(
                  report.daily[selectedDay].operationalCents +
                    report.daily[selectedDay].personalCents +
                    report.daily[selectedDay].fuelCents,
                )}
              </p>
            </div>
          )}
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span>
              <i className="mr-1.5 inline-block size-2 rounded-full bg-primary" />
              Ingresos
            </span>
            <span>
              <i className="mr-1.5 inline-block size-2 rounded-full bg-foreground/65" />
              Gastos
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <WeekMetric
          label="Ingresos"
          amount={income}
          icon={<ArrowUpRight size={18} />}
        />
        <WeekMetric
          label="Gastos"
          amount={expenses}
          icon={<ArrowDownRight size={18} />}
        />
      </section>
    </div>
  );
}

function ComparisonBar({
  label,
  amount,
  maximum,
  tone,
}: {
  label: string;
  amount: number;
  maximum: number;
  tone: "income" | "expense";
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <strong className="tabular-nums">{formatMoney(amount)}</strong>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${tone === "income" ? "bg-primary" : "bg-foreground/75"}`}
          style={{
            width: `${amount ? Math.max(2, (amount / maximum) * 100) : 0}%`,
          }}
        />
      </div>
    </div>
  );
}

function WeekMetric({
  label,
  amount,
  icon,
}: {
  label: string;
  amount: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums">
        {formatMoney(amount)}
      </p>
    </div>
  );
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatWeekday(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
function formatFullDate(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
