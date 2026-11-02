import Link from "next/link";
import {
  ArrowRight,
  BanknoteArrowUp,
  Check,
  Clock3,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/finance/money";
import type { DashboardEarningsSummary } from "@/features/earnings/queries";
import type { UserPlatform } from "@/types/database";
import { AppWelcomeTour } from "@/features/onboarding/app-welcome-tour";
import type { QuickRegisterData } from "@/components/layout/quick-register-menu";
import { DashboardRegisterActions } from "./dashboard-register-actions";
import {
  ActiveShiftSummary,
  type DashboardShift,
} from "./active-shift-summary";
import { WeeklyEarningsChart } from "./weekly-earnings-chart";

export function EmptyDashboard({
  preview = false,
  name,
  current = null,
  activePlatforms = [],
  quickRegister,
  earningsSummary = {
    days: [],
    today: { count: 0, grossCents: 0 },
    weekExpensesCents: 0,
    weekGrossCents: 0,
  },
}: {
  preview?: boolean;
  name?: string;
  current?: DashboardShift | null;
  activePlatforms?: UserPlatform[];
  quickRegister?: QuickRegisterData;
  earningsSummary?: DashboardEarningsSummary;
}) {
  const base = preview ? "/preview" : "/app";
  const referenceTime = new Date().toISOString();
  const date = new Intl.DateTimeFormat("es-PE", {
    dateStyle: "full",
    timeZone: "America/Lima",
  }).format(new Date());
  const greeting = name ? `Hola, ${name.split(" ")[0]}.` : "Hola.";
  const todayExpensesCents = earningsSummary.days.at(-1)?.expensesCents ?? 0;

  return (
    <div className="max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs capitalize text-muted-foreground">
            {date}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-[34px]">
            {greeting}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Elige qué quieres registrar ahora.
          </p>
        </div>
        <Badge className="h-9 gap-2 bg-card px-3 text-xs">
          <span className="size-1.5 rounded-full bg-primary" /> Hoy · PEN
        </Badge>
      </header>

      <section data-tour="journey" className="max-w-md" aria-label="Tu jornada">
        <ActiveShiftSummary
          base={base}
          current={current}
          activePlatforms={activePlatforms}
          referenceTime={referenceTime}
        />
      </section>

      {quickRegister && !preview ? (
        <DashboardRegisterActions {...quickRegister} />
      ) : (
        <QuickActions base={base} />
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.82fr)_minmax(420px,1.18fr)]">
        <section
          className="rounded-2xl bg-panel p-5 text-panel-foreground sm:p-6"
          aria-label="Resumen semanal"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm text-white/75">
                <TrendingUp size={17} /> Ingresos de hoy
              </p>
              <p className="mt-3 tabular text-4xl font-semibold tracking-tight sm:text-5xl">
                {formatMoney(earningsSummary.today.grossCents)}
              </p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80">
              Hoy
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-xs">
            <div>
              <p className="text-white/60">Gastos de hoy</p>
              <p className="mt-1 tabular text-base font-semibold">
                {formatMoney(todayExpensesCents)}
              </p>
            </div>
            <div>
              <p className="text-white/60">Después de gastos</p>
              <p className="mt-1 tabular text-base font-semibold">
                {formatMoney(
                  earningsSummary.today.grossCents - todayExpensesCents,
                )}
              </p>
            </div>
          </div>
        </section>
        <WeeklyEarningsChart summary={earningsSummary} />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 px-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Check size={12} /> PEN · Hora de Lima (UTC−5)
        </span>
        <span>Rinde</span>
      </footer>
      <AppWelcomeTour enabled={!preview} />
    </div>
  );
}

function QuickActions({ base }: { base: string }) {
  const actions = [
    {
      href: `${base}/earnings`,
      icon: BanknoteArrowUp,
      label: "Ver ingresos",
      detail: "Tu historial y registros",
    },
    {
      href: `${base}/expenses`,
      icon: ReceiptText,
      label: "Ver gastos",
      detail: "Gastos y recargas",
    },
    {
      href: `${base}/activity`,
      icon: Clock3,
      label: "Ver jornadas",
      detail: "Tu tiempo de trabajo",
    },
  ];

  return (
    <section data-tour="quick-actions" aria-labelledby="quick-actions-title">
      <div className="mb-3">
        <h2
          id="quick-actions-title"
          className="text-base font-semibold tracking-tight"
        >
          Acciones rápidas
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Registra lo importante sin buscar entre pantallas.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {actions.map(({ detail, href, icon: Icon, label }) => (
          <Link
            key={label}
            href={href}
            className="group flex min-h-20 items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {detail}
              </span>
            </span>
            <ArrowRight
              size={17}
              className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
