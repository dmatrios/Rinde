"use client";

import { useState, useTransition } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  LoaderCircle,
  PieChart,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ReportPeriod } from "@/features/reports/report-math";
import { downloadReportPdf } from "@/features/reports/report-pdf";
import { addPeriod, type ReportRange } from "@/features/reports/periods";
import type { ReportsData } from "@/features/reports/queries";
import { formatMoney } from "@/lib/finance/money";

const rangeLabels: Record<ReportRange, string> = {
  day: "Hoy",
  month: "Últimos 30 días",
  week: "Últimos 7 días",
};

export function ReportsView({
  anchorDate,
  day,
  initialRange,
  month,
  name,
  todayDate,
  week,
}: ReportsData & { initialRange: ReportRange }) {
  const { toast } = useToast();
  const router = useRouter();
  const [range, setRange] = useState<ReportRange>(initialRange);
  const [navigating, startNavigation] = useTransition();
  const [exporting, setExporting] = useState(false);
  const report = { day, week, month }[range];
  const periodLabel = rangeLabels[range];
  const expensesCents =
    report.metrics.operationalCents + report.metrics.personalCents;
  const hasData = report.metrics.grossCents || expensesCents;
  const navigate = (nextRange: ReportRange, nextDate = anchorDate) => {
    setRange(nextRange);
    startNavigation(() => {
      router.push(`/app/reports?range=${nextRange}&date=${nextDate}`);
    });
  };
  const nextDate = addPeriod(anchorDate, range, 1);

  const exportPdf = async () => {
    setExporting(true);
    try {
      await downloadReportPdf(
        name,
        `${periodLabel} - ${formatPeriod(report)}`,
        report,
      );
      toast("Tu reporte en PDF está listo.");
    } catch {
      toast("No pudimos preparar el PDF. Inténtalo nuevamente.", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            Tu actividad, en perspectiva
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Filtra tu actividad y entiende cómo va tu dinero.
          </p>
        </div>
        <div
          aria-label="Filtrar reportes por periodo"
          className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-xs"
        >
          <RangeButton active={range === "day"} onClick={() => navigate("day")}>
            Día
          </RangeButton>
          <RangeButton
            active={range === "week"}
            onClick={() => navigate("week")}
          >
            Semana
          </RangeButton>
          <RangeButton
            active={range === "month"}
            onClick={() => navigate("month")}
          >
            Mes
          </RangeButton>
        </div>
      </div>

      <PeriodNavigator
        date={anchorDate}
        disabled={navigating}
        nextDisabled={nextDate > todayDate}
        range={range}
        todayDate={todayDate}
        onNext={() => navigate(range, nextDate)}
        onPrevious={() => navigate(range, addPeriod(anchorDate, range, -1))}
        onToday={() => navigate("day", todayDate)}
        onDateSelect={(date) => navigate(range, date)}
      />

      <section className="rounded-3xl bg-foreground px-5 py-6 text-background shadow-[0_22px_52px_-32px_rgb(32_42_58_/_0.8)] sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs text-background/65">
              <WalletCards size={16} /> {periodLabel}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {formatMoney(report.metrics.remainingCents)}
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-background/70">
              Lo que queda después de todos los gastos que registraste.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="relative bg-background text-foreground hover:bg-background/90"
            disabled={exporting}
            onClick={exportPdf}
          >
            <span
              className={exporting ? "invisible" : "flex items-center gap-2"}
            >
              <Download /> Generar PDF
            </span>
            {exporting && (
              <LoaderCircle className="absolute animate-spin" aria-hidden />
            )}
            {exporting && <span className="sr-only">Preparando PDF</span>}
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Ingresos"
          value={formatMoney(report.metrics.grossCents)}
          tone="income"
        />
        <Metric
          label="Resultado operativo"
          value={formatMoney(report.metrics.resultCents)}
          tone="result"
        />
        <Metric
          label="Gastos operativos"
          value={formatMoney(report.metrics.operationalCents)}
        />
        <Metric
          label="Gastos personales"
          value={formatMoney(report.metrics.personalCents)}
        />
      </section>

      {hasData ? (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,.75fr)]">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  <BarChart3 size={18} /> Ingresos y gastos
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Toca una barra para ver el detalle del día.
                </p>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                PEN
              </span>
            </div>
            <DailyChart key={`${range}-${anchorDate}`} report={report} />
          </div>
          <ExpenseChart report={report} />
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
          <EmptyReport />
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-2">
        <Breakdown
          title="Ingresos por plataforma"
          entries={report.platformBreakdown}
          empty="Aún no hay ingresos para comparar."
        />
        <Breakdown
          title="Gastos registrados"
          entries={report.categoryBreakdown}
          empty="Aún no hay gastos registrados en este periodo."
        />
      </section>
    </div>
  );
}

function RangeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 ${active ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function PeriodNavigator({
  date,
  disabled,
  nextDisabled,
  onNext,
  onPrevious,
  onDateSelect,
  onToday,
  range,
  todayDate,
}: {
  date: string;
  disabled: boolean;
  nextDisabled: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onDateSelect: (date: string) => void;
  onToday: () => void;
  range: ReportRange;
  todayDate: string;
}) {
  const isToday = date === todayDate && range === "day";
  return (
    <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:px-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground">
          Fecha de referencia
        </p>
        <ReportDatePicker
          key={date}
          date={date}
          disabled={disabled}
          onSelect={onDateSelect}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {periodTitle(date, range)}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {!isToday && (
          <button
            type="button"
            disabled={disabled}
            onClick={onToday}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-secondary disabled:opacity-50"
          >
            Ver hoy
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          aria-label="Ver período anterior"
          onClick={onPrevious}
          className="grid size-9 place-items-center rounded-lg border border-border transition-colors hover:bg-muted disabled:opacity-50"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          disabled={disabled || nextDisabled}
          aria-label="Ver período siguiente"
          onClick={onNext}
          className="grid size-9 place-items-center rounded-lg border border-border transition-colors hover:bg-muted disabled:opacity-50"
        >
          {disabled ? (
            <LoaderCircle className="animate-spin" size={16} />
          ) : (
            <ChevronRight size={18} />
          )}
        </button>
      </div>
    </div>
  );
}

function ReportDatePicker({
  date,
  disabled,
  onSelect,
}: {
  date: string;
  disabled: boolean;
  onSelect: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(startOfMonth(date));
  const days = calendarDays(viewMonth);

  return (
    <div className="relative mt-1.5 inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="mt-1.5 flex min-h-10 w-full items-center gap-2 rounded-xl border border-border bg-card px-3 text-left text-sm font-semibold shadow-xs transition-all hover:border-primary/35 hover:bg-secondary/45 disabled:opacity-50 sm:min-w-72"
      >
        <CalendarDays size={17} className="shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">
          {formatPickerDate(date)}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Elegir fecha para el reporte"
          className="absolute left-0 top-[calc(100%+10px)] z-40 w-72 rounded-2xl border border-border bg-card p-3 shadow-[0_20px_45px_-20px_rgb(32_42_58_/_0.45)]"
        >
          <div className="flex items-center justify-between gap-2 px-1 pb-3">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => setViewMonth(addMonth(viewMonth, -1))}
              className="grid size-8 place-items-center rounded-lg hover:bg-muted"
            >
              <ChevronLeft size={17} />
            </button>
            <p className="text-sm font-semibold">{formatMonth(viewMonth)}</p>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => setViewMonth(addMonth(viewMonth, 1))}
              className="grid size-8 place-items-center rounded-lg hover:bg-muted"
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
            {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
              <span key={`${label}-${index}`} className="py-1">
                {label}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day, index) =>
              day ? (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    onSelect(day);
                    setOpen(false);
                  }}
                  className={`grid size-8 place-items-center rounded-lg text-xs font-medium transition-colors ${day === date ? "bg-primary text-primary-foreground shadow-xs" : "hover:bg-secondary"}`}
                >
                  {Number(day.slice(-2))}
                </button>
              ) : (
                <span key={`empty-${index}`} className="size-8" />
              ),
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(currentPeruDate());
              setOpen(false);
            }}
            className="mt-3 w-full rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/75"
          >
            Ir a hoy
          </button>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "income" | "result";
  value: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-xs ${tone === "income" ? "border-primary/15 bg-secondary/55" : tone === "result" ? "border-success/20 bg-success/5" : "border-border bg-card"}`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function DailyChart({ report }: { report: ReportPeriod }) {
  const points = chartPoints(report);
  const mostRecentMovement = points.findLastIndex(
    (point) => point.grossCents || point.expensesCents,
  );
  const [selectedIndex, setSelectedIndex] = useState(
    mostRecentMovement >= 0 ? mostRecentMovement : points.length - 1,
  );
  const selected = points[selectedIndex]!;
  const maximum = Math.max(
    ...points.flatMap((point) => [point.grossCents, point.expensesCents]),
    1,
  );

  return (
    <div className="mt-7">
      <div className="flex h-52 items-end gap-1.5 border-b border-border pb-2 sm:gap-2">
        {points.map((point, index) => {
          return (
            <button
              key={point.key}
              type="button"
              aria-label={`${point.description}: ${formatMoney(point.grossCents)} de ingresos y ${formatMoney(point.expensesCents)} de gastos`}
              aria-pressed={selectedIndex === index}
              onMouseEnter={() => setSelectedIndex(index)}
              onFocus={() => setSelectedIndex(index)}
              onClick={() => setSelectedIndex(index)}
              className="group relative flex h-full min-w-0 flex-1 flex-col justify-end rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {selectedIndex === index && (
                <ChartTooltip
                  description={point.description}
                  expenses={point.expensesCents}
                  gross={point.grossCents}
                  orders={point.orders}
                />
              )}
              <div className="flex h-full w-full items-end justify-center gap-px sm:gap-1">
                <span
                  className={`w-[48%] max-w-6 rounded-t-sm transition-colors duration-200 ${point.grossCents ? (selectedIndex === index ? "bg-primary" : "bg-primary/70 group-hover:bg-primary/90") : "bg-muted-foreground/20 group-hover:bg-muted-foreground/35"}`}
                  style={{ height: `${barHeight(point.grossCents, maximum)}%` }}
                />
                <span
                  className={`w-[36%] max-w-5 rounded-t-sm transition-colors duration-200 ${point.expensesCents ? (selectedIndex === index ? "bg-foreground/80" : "bg-muted-foreground/40 group-hover:bg-muted-foreground/60") : "bg-muted-foreground/15 group-hover:bg-muted-foreground/30"}`}
                  style={{
                    height: `${barHeight(point.expensesCents, maximum)}%`,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2">
        {points.map((point) => (
          <span
            key={point.key}
            className="min-w-0 flex-1 truncate text-center text-[10px] text-muted-foreground"
          >
            {point.label}
          </span>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <i className="size-2 rounded-sm bg-primary" /> Ingresos
        </span>
        <span className="flex items-center gap-2">
          <i className="size-2 rounded-sm bg-foreground/80" /> Gastos
        </span>
      </div>
      <div className="mt-4 grid gap-2 rounded-xl border border-border bg-muted/35 p-3 text-sm lg:hidden">
        <p className="font-medium">{selected.description}</p>
        <p className="text-muted-foreground">
          Ingresos{" "}
          <span className="font-semibold text-foreground">
            {formatMoney(selected.grossCents)}
          </span>
        </p>
        <p className="text-muted-foreground">
          Gastos{" "}
          <span className="font-semibold text-foreground">
            {formatMoney(selected.expensesCents)}
          </span>
        </p>
        <p className="text-muted-foreground">
          Pedidos{" "}
          <span className="font-semibold text-foreground">
            {selected.orders || "Sin detalle"}
          </span>
        </p>
      </div>
    </div>
  );
}

function ChartTooltip({
  description,
  expenses,
  gross,
  orders,
}: {
  description: string;
  expenses: number;
  gross: number;
  orders: number;
}) {
  return (
    <span className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-10 hidden w-48 -translate-x-1/2 rounded-xl border border-border bg-card p-3 text-left shadow-lg lg:block">
      <span className="block text-xs font-semibold">{description}</span>
      <span className="mt-2 grid gap-1 text-[11px] text-muted-foreground">
        <span>
          Ingresos{" "}
          <strong className="float-right text-foreground">
            {formatMoney(gross)}
          </strong>
        </span>
        <span>
          Gastos{" "}
          <strong className="float-right text-foreground">
            {formatMoney(expenses)}
          </strong>
        </span>
        <span>
          Pedidos{" "}
          <strong className="float-right text-foreground">
            {orders || "—"}
          </strong>
        </span>
      </span>
    </span>
  );
}

function ExpenseChart({ report }: { report: ReportPeriod }) {
  const operational = report.metrics.operationalCents;
  const personal = report.metrics.personalCents;
  const total = operational + personal;
  const operationalPercent = total
    ? Math.round((operational / total) * 100)
    : 0;
  const personalPercent = total ? 100 - operationalPercent : 0;
  const chartStyle = {
    background:
      total > 0
        ? `conic-gradient(var(--primary) 0 ${operationalPercent}%, var(--foreground) ${operationalPercent}% 100%)`
        : "var(--muted)",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <PieChart size={18} /> Tus gastos
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Cómo se distribuyen en este periodo.
      </p>
      {total ? (
        <div className="mt-7 flex items-center gap-5">
          <div
            aria-label={`${operationalPercent}% operativos y ${personalPercent}% personales`}
            className="relative grid size-32 shrink-0 place-items-center rounded-full"
            style={chartStyle}
          >
            <div className="grid size-20 place-items-center rounded-full bg-card text-center">
              <span className="text-[10px] text-muted-foreground">Total</span>
              <strong className="text-xs">{formatMoney(total)}</strong>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <LegendItem
              color="bg-primary"
              label="Operativos"
              percent={operationalPercent}
              value={operational}
            />
            <LegendItem
              color="bg-foreground"
              label="Personales"
              percent={personalPercent}
              value={personal}
            />
          </div>
        </div>
      ) : (
        <p className="mt-8 text-sm leading-6 text-muted-foreground">
          Cuando registres un gasto, aquí verás cómo se distribuye.
        </p>
      )}
    </div>
  );
}

function LegendItem({
  color,
  label,
  percent,
  value,
}: {
  color: string;
  label: string;
  percent: number;
  value: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-2 font-medium">
          <i className={`size-2.5 rounded-full ${color}`} /> {label}
        </span>
        <span className="text-muted-foreground">{percent}%</span>
      </div>
      <p className="mt-1 text-sm font-semibold">{formatMoney(value)}</p>
    </div>
  );
}

function Breakdown({
  empty,
  entries,
  title,
}: {
  empty: string;
  entries: ReportPeriod["categoryBreakdown"];
  title: string;
}) {
  const total = entries.reduce((sum, entry) => sum + entry.cents, 0);
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {entries.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {formatMoney(total)}
          </span>
        )}
      </div>
      {entries.length ? (
        <ul className="mt-5 space-y-4">
          {entries.slice(0, 6).map((entry) => {
            const percent = Math.round((entry.cents / total) * 100);
            return (
              <li key={entry.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{entry.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {percent}% · {formatMoney(entry.cents)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${Math.max(percent, 4)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 text-sm leading-6 text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function EmptyReport() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary">
        <BarChart3 size={20} />
      </span>
      <p className="mt-4 text-sm font-semibold">Aquí verás tu avance.</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        Registra un ingreso o gasto y volverá organizado por día.
      </p>
    </div>
  );
}

function expenseCents(day: ReportPeriod["daily"][number]) {
  return day.operationalCents + day.personalCents + day.fuelCents;
}

type ChartPoint = {
  description: string;
  expensesCents: number;
  grossCents: number;
  key: string;
  label: string;
  orders: number;
};

function chartPoints(report: ReportPeriod): ChartPoint[] {
  if (report.daily.length <= 7) {
    return report.daily.map((day) => ({
      description: formatDate(day.date),
      expensesCents: expenseCents(day),
      grossCents: day.grossCents,
      key: day.date,
      label: formatShortDay(day.date),
      orders: day.orders,
    }));
  }

  const groups: ChartPoint[] = [];
  for (let index = 0; index < report.daily.length; index += 7) {
    const days = report.daily.slice(index, index + 7);
    const first = days[0]!;
    const last = days.at(-1)!;
    groups.push({
      description: `${formatDate(first.date)} al ${formatDate(last.date)}`,
      expensesCents: days.reduce((total, day) => total + expenseCents(day), 0),
      grossCents: days.reduce((total, day) => total + day.grossCents, 0),
      key: `${first.date}-${last.date}`,
      label: `${dayOfMonth(first.date)}-${dayOfMonth(last.date)}`,
      orders: days.reduce((total, day) => total + day.orders, 0),
    });
  }
  return groups;
}

function barHeight(value: number, maximum: number) {
  return value ? Math.max((value / maximum) * 100, 5) : 3;
}

function formatPeriod(report: ReportPeriod) {
  return `${formatDate(report.startDate)} al ${formatDate(report.endDate)}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function periodTitle(date: string, range: ReportRange) {
  if (range === "day") return formatDate(date);
  if (range === "week") {
    const start = new Date(`${date}T12:00:00Z`);
    const weekday = start.getUTCDay() || 7;
    start.setUTCDate(start.getUTCDate() - weekday + 1);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return `${formatDateValue(start)} al ${formatDateValue(end)}`;
  }
  return new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatDateValue(date: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function formatShortDay(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(".", "");
}

function dayOfMonth(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function startOfMonth(date: string) {
  return new Date(`${date.slice(0, 7)}-01T12:00:00Z`);
}

function addMonth(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + amount);
  return next;
}

function calendarDays(month: Date) {
  const start = new Date(month);
  const offset = (start.getUTCDay() || 7) - 1;
  const dates: Array<string | null> = Array.from(
    { length: offset },
    () => null,
  );
  while (start.getUTCMonth() === month.getUTCMonth()) {
    dates.push(start.toISOString().slice(0, 10));
    start.setUTCDate(start.getUTCDate() + 1);
  }
  while (dates.length % 7) dates.push(null);
  return dates;
}

function formatMonth(month: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(month);
}

function formatPickerDate(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function currentPeruDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
