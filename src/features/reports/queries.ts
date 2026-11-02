import "server-only";

import { cache } from "react";
import {
  buildReportPeriod,
  type ReportPeriod,
} from "@/features/reports/report-math";
import {
  datesForMonth,
  datesForWeek,
  isBusinessDate,
} from "@/features/reports/periods";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type {
  Earning,
  Expense,
  ExpenseCategory,
  FuelRefill,
  PaymentReceipt,
  Profile,
  UserPlatform,
} from "@/types/database";

export type ReportsData = {
  anchorDate: string;
  day: ReportPeriod;
  month: ReportPeriod;
  name: string;
  todayDate: string;
  week: ReportPeriod;
};

export const getReportsData = cache(
  async (requestedDate?: string): Promise<ReportsData> => {
    const user = await requireUser();
    const supabase = await createClient();
    const todayDate = peruDate();
    const anchorDate = isBusinessDate(requestedDate)
      ? requestedDate
      : todayDate;
    const dayDates = [anchorDate];
    const weekDates = datesForWeek(anchorDate);
    const monthDates = datesForMonth(anchorDate);
    const dates = [
      ...new Set([...dayDates, ...weekDates, ...monthDates]),
    ].sort();
    const startDate = dates[0]!;
    const endExclusive = nextDate(dates.at(-1)!);
    const [
      profileResult,
      platformsResult,
      categoriesResult,
      earningsResult,
      expensesResult,
      fuelResult,
      receiptsResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single(),
      supabase.from("user_platforms").select("*").eq("user_id", user.id),
      supabase.from("expense_categories").select("*").eq("user_id", user.id),
      supabase
        .from("earnings")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lt("date", endExclusive),
      supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("occurred_at", `${startDate}T00:00:00-05:00`)
        .lt("occurred_at", `${endExclusive}T00:00:00-05:00`),
      supabase
        .from("fuel_refills")
        .select("*")
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
      profileResult.error ||
      platformsResult.error ||
      categoriesResult.error ||
      earningsResult.error ||
      expensesResult.error ||
      fuelResult.error ||
      receiptsResult.error
    ) {
      throw new Error("No pudimos cargar tus reportes.");
    }

    const sources = {
      categories: categoriesResult.data as ExpenseCategory[],
      earnings: earningsResult.data as Earning[],
      expenses: expensesResult.data as Expense[],
      fuel: fuelResult.data as FuelRefill[],
      receipts: receiptsResult.data as PaymentReceipt[],
      platforms: platformsResult.data as UserPlatform[],
    };
    return {
      anchorDate,
      day: buildReportPeriod(sources, dayDates),
      month: buildReportPeriod(sources, monthDates),
      name: (profileResult.data as Pick<Profile, "display_name">).display_name,
      todayDate,
      week: buildReportPeriod(sources, weekDates),
    };
  },
);

function nextDate(date: string): string {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

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
