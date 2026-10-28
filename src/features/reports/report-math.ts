import { decimalToCents, earningGrossCents } from "@/lib/finance/money";
import type {
  Earning,
  Expense,
  ExpenseCategory,
  FuelRefill,
  UserPlatform,
} from "@/types/database";

export type ReportPeriod = {
  categoryBreakdown: ReportBreakdown[];
  daily: ReportDay[];
  endDate: string;
  metrics: ReportMetrics;
  platformBreakdown: ReportBreakdown[];
  startDate: string;
};

export type ReportBreakdown = {
  cents: number;
  label: string;
};

export type ReportDay = {
  fuelCents: number;
  grossCents: number;
  label: string;
  orders: number;
  operationalCents: number;
  personalCents: number;
  date: string;
};

export type ReportMetrics = {
  grossCents: number;
  operationalCents: number;
  personalCents: number;
  remainingCents: number;
  resultCents: number;
};

type ReportSources = {
  categories: ExpenseCategory[];
  earnings: Earning[];
  expenses: Expense[];
  fuel: FuelRefill[];
  platforms: UserPlatform[];
};

export function buildReportPeriod(
  sources: ReportSources,
  dates: string[],
): ReportPeriod {
  const categoriesById = new Map(
    sources.categories.map((category) => [category.id, category]),
  );
  const platformsById = new Map(
    sources.platforms.map((platform) => [platform.id, platform.name]),
  );
  const includedDates = new Set(dates);
  const daily = new Map(
    dates.map((date) => [
      date,
      {
        date,
        fuelCents: 0,
        grossCents: 0,
        orders: 0,
        operationalCents: 0,
        personalCents: 0,
      },
    ]),
  );
  const byCategory = new Map<string, number>();
  const byPlatform = new Map<string, number>();

  for (const earning of sources.earnings) {
    if (!includedDates.has(earning.date)) continue;
    const cents = earningGrossCents(earning);
    const day = daily.get(earning.date);
    if (day) {
      day.grossCents += cents;
      day.orders += earning.orders ?? 0;
    }
    const platform = platformsById.get(earning.platform_id) ?? "Plataforma";
    byPlatform.set(platform, (byPlatform.get(platform) ?? 0) + cents);
  }

  for (const expense of sources.expenses) {
    const date = peruDate(new Date(expense.occurred_at));
    if (!includedDates.has(date)) continue;
    const cents = decimalToCents(expense.amount);
    const day = daily.get(date);
    const category = categoriesById.get(expense.category_id);
    const label = category?.name ?? "Categoría";
    byCategory.set(label, (byCategory.get(label) ?? 0) + cents);
    if (!day) continue;
    if (category?.kind === "operational") day.operationalCents += cents;
    else day.personalCents += cents;
  }

  for (const refill of sources.fuel) {
    const date = peruDate(new Date(refill.occurred_at));
    if (!includedDates.has(date)) continue;
    const cents = decimalToCents(refill.amount);
    const day = daily.get(date);
    if (day) day.fuelCents += cents;
    byCategory.set("Combustible", (byCategory.get("Combustible") ?? 0) + cents);
  }

  const reportDays = dates.map((date) => ({
    ...daily.get(date)!,
    label: new Intl.DateTimeFormat("es-PE", {
      day: "numeric",
      month: dates.length > 7 ? "short" : undefined,
      timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`)),
  }));
  const grossCents = reportDays.reduce(
    (total, day) => total + day.grossCents,
    0,
  );
  const operationalCents = reportDays.reduce(
    (total, day) => total + day.operationalCents + day.fuelCents,
    0,
  );
  const personalCents = reportDays.reduce(
    (total, day) => total + day.personalCents,
    0,
  );

  return {
    categoryBreakdown: breakdown(byCategory),
    daily: reportDays,
    endDate: dates.at(-1)!,
    metrics: {
      grossCents,
      operationalCents,
      personalCents,
      remainingCents: grossCents - operationalCents - personalCents,
      resultCents: grossCents - operationalCents,
    },
    platformBreakdown: breakdown(byPlatform),
    startDate: dates[0]!,
  };
}

function breakdown(items: Map<string, number>): ReportBreakdown[] {
  return [...items.entries()]
    .map(([label, cents]) => ({ label, cents }))
    .filter((item) => item.cents > 0)
    .sort((left, right) => right.cents - left.cents);
}

function peruDate(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
