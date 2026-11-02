import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth/session";
import { decimalToCents, earningGrossCents } from "@/lib/finance/money";
import { createClient } from "@/lib/supabase/server";
import type {
  Earning,
  Expense,
  FuelRefill,
  PaymentReceipt,
  UserPlatform,
  WorkShift,
} from "@/types/database";

export type EarningsRecord = Earning & { platformName: string };
export type EarningShift = WorkShift & { platformName: string };

function peruDate(value = new Date()): string {
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

export const getEarningsWorkspace = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const [settingsResult, platformsResult, earningsResult, shiftsResult] =
    await Promise.all([
      supabase
        .from("user_settings")
        .select("earnings_mode")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("user_platforms")
        .select("*")
        .eq("user_id", user.id)
        .order("name"),
      supabase
        .from("earnings")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(60),
      supabase
        .from("work_shifts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(60),
    ]);

  if (
    settingsResult.error ||
    platformsResult.error ||
    earningsResult.error ||
    shiftsResult.error
  ) {
    throw new Error("No pudimos cargar tus ingresos.");
  }

  const platforms = platformsResult.data as UserPlatform[];
  const platformNames = new Map(platforms.map((item) => [item.id, item.name]));
  return {
    defaultMode: settingsResult.data.earnings_mode,
    platforms: platforms.filter((platform) => platform.active),
    earnings: (earningsResult.data as Earning[]).map((earning) => ({
      ...earning,
      platformName: platformNames.get(earning.platform_id) ?? "Plataforma",
    })),
    shifts: (shiftsResult.data as WorkShift[]).map((shift) => ({
      ...shift,
      platformName: platformNames.get(shift.platform_id) ?? "Plataforma",
    })),
  };
});

export const getTodayEarningsSummary = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("earnings")
    .select("reported_amount, tips, bonuses, tips_included, bonuses_included")
    .eq("user_id", user.id)
    .eq("date", peruDate());
  if (error) throw new Error("No pudimos cargar el resumen de ingresos.");
  return {
    count: data.length,
    grossCents: (
      data as Pick<
        Earning,
        | "reported_amount"
        | "tips"
        | "bonuses"
        | "tips_included"
        | "bonuses_included"
      >[]
    ).reduce((total, earning) => total + earningGrossCents(earning), 0),
  };
});

export type DashboardEarningsSummary = {
  days: Array<{
    date: string;
    expensesCents: number;
    grossCents: number;
    label: string;
    orders: number;
  }>;
  today: { count: number; grossCents: number };
  weekExpensesCents: number;
  weekGrossCents: number;
};

export const getDashboardEarningsSummary = cache(
  async (): Promise<DashboardEarningsSummary> => {
    const user = await requireUser();
    const supabase = await createClient();
    const dates = recentBusinessDates();
    const startDate = dates[0]!;
    const endDate = dates.at(-1)!;
    const endExclusive = nextDate(endDate);
    const [earningsResult, expensesResult, fuelResult, receiptsResult] =
      await Promise.all([
        supabase
          .from("earnings")
          .select(
            "date, mode, shift_id, platform_id, reported_amount, tips, bonuses, tips_included, bonuses_included, orders",
          )
          .eq("user_id", user.id)
          .gte("date", startDate)
          .lte("date", endDate),
        supabase
          .from("expenses")
          .select("occurred_at, amount")
          .eq("user_id", user.id)
          .gte("occurred_at", `${startDate}T00:00:00-05:00`)
          .lt("occurred_at", `${endExclusive}T00:00:00-05:00`),
        supabase
          .from("fuel_refills")
          .select("occurred_at, amount")
          .eq("user_id", user.id)
          .gte("occurred_at", `${startDate}T00:00:00-05:00`)
          .lt("occurred_at", `${endExclusive}T00:00:00-05:00`),
        supabase
          .from("payment_receipts")
          .select("*")
          .eq("user_id", user.id)
          .gte("occurred_at", `${startDate}T00:00:00-05:00`)
          .lt("occurred_at", `${endExclusive}T00:00:00-05:00`),
      ]);

    if (
      earningsResult.error ||
      expensesResult.error ||
      fuelResult.error ||
      receiptsResult.error
    ) {
      throw new Error("No pudimos cargar tu avance.");
    }

    const grossByDate = new Map(dates.map((date) => [date, 0]));
    const countByDate = new Map(dates.map((date) => [date, 0]));
    const ordersByDate = new Map(dates.map((date) => [date, 0]));
    const expensesByDate = new Map(dates.map((date) => [date, 0]));
    for (const earning of earningsResult.data as Array<
      Pick<
        Earning,
        | "date"
        | "reported_amount"
        | "tips"
        | "bonuses"
        | "tips_included"
        | "bonuses_included"
        | "orders"
        | "mode"
        | "shift_id"
        | "platform_id"
      >
    >) {
      grossByDate.set(
        earning.date,
        (grossByDate.get(earning.date) ?? 0) + earningGrossCents(earning),
      );
      countByDate.set(earning.date, (countByDate.get(earning.date) ?? 0) + 1);
      ordersByDate.set(
        earning.date,
        (ordersByDate.get(earning.date) ?? 0) + (earning.orders ?? 0),
      );
    }
    for (const receipt of receiptsResult.data as PaymentReceipt[]) {
      const date = peruDate(new Date(receipt.occurred_at));
      const coveredEarnings = earningsResult.data.filter(
        (earning) =>
          (earning.mode === "shift" &&
            receipt.shift_id !== null &&
            earning.shift_id === receipt.shift_id) ||
          (earning.mode === "daily" &&
            earning.date === date &&
            earning.platform_id === receipt.platform_id),
      );
      if (coveredEarnings.length) {
        if (coveredEarnings.every((earning) => earning.orders === null)) {
          ordersByDate.set(date, (ordersByDate.get(date) ?? 0) + 1);
        }
        continue;
      }
      grossByDate.set(
        date,
        (grossByDate.get(date) ?? 0) + decimalToCents(receipt.amount),
      );
      countByDate.set(date, (countByDate.get(date) ?? 0) + 1);
      ordersByDate.set(date, (ordersByDate.get(date) ?? 0) + 1);
    }
    for (const expense of expensesResult.data as Array<
      Pick<Expense, "occurred_at" | "amount">
    >) {
      const date = peruDate(new Date(expense.occurred_at));
      expensesByDate.set(
        date,
        (expensesByDate.get(date) ?? 0) + decimalToCents(expense.amount),
      );
    }
    for (const refill of fuelResult.data as Array<
      Pick<FuelRefill, "occurred_at" | "amount">
    >) {
      const date = peruDate(new Date(refill.occurred_at));
      expensesByDate.set(
        date,
        (expensesByDate.get(date) ?? 0) + decimalToCents(refill.amount),
      );
    }

    const today = dates.at(-1)!;
    const days = dates.map((date) => ({
      date,
      label: new Intl.DateTimeFormat("es-PE", {
        weekday: "narrow",
        timeZone: "UTC",
      })
        .format(new Date(`${date}T12:00:00Z`))
        .toUpperCase(),
      expensesCents: expensesByDate.get(date) ?? 0,
      grossCents: grossByDate.get(date) ?? 0,
      orders: ordersByDate.get(date) ?? 0,
    }));

    return {
      days,
      today: {
        count: countByDate.get(today) ?? 0,
        grossCents: grossByDate.get(today) ?? 0,
      },
      weekExpensesCents: days.reduce(
        (total, day) => total + day.expensesCents,
        0,
      ),
      weekGrossCents: days.reduce((total, day) => total + day.grossCents, 0),
    };
  },
);

function recentBusinessDates() {
  const end = new Date(`${peruDate()}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });
}

function nextDate(date: string) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}
