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
import {
  calculateWeeklyProductivity,
  type WeeklyProductivity,
} from "@/features/reports/productivity";
import { createClient } from "@/lib/supabase/server";
import type {
  Earning,
  Expense,
  ExpenseCategory,
  FuelRefill,
  PaymentReceipt,
  Profile,
  UserPlatform,
  WorkShift,
  ShiftPause,
} from "@/types/database";

export type ReportsData = {
  anchorDate: string;
  day: ReportPeriod;
  month: ReportPeriod;
  name: string;
  selectedWeek: ReportPeriod;
  selectedWeekDate: string;
  todayDate: string;
  week: ReportPeriod;
  weeklyGoal: number | null;
  productivity: WeeklyProductivity;
};

export const getReportsData = cache(
  async (
    requestedDate?: string,
    requestedWeekDate?: string,
  ): Promise<ReportsData> => {
    const user = await requireUser();
    const supabase = await createClient();
    const todayDate = peruDate();
    const anchorDate = isBusinessDate(requestedDate)
      ? requestedDate
      : todayDate;
    const selectedWeekDate =
      isBusinessDate(requestedWeekDate) && requestedWeekDate <= todayDate
        ? requestedWeekDate
        : todayDate;
    const dayDates = [anchorDate];
    const weekDates = datesForWeek(anchorDate);
    const selectedWeekDates = datesForWeek(selectedWeekDate).filter(
      (date) => date <= todayDate,
    );
    const monthDates = datesForMonth(anchorDate);
    const dates = [
      ...new Set([...dayDates, ...weekDates, ...monthDates]),
    ].sort();
    const startDate = dates[0]!;
    const endExclusive = nextDate(dates.at(-1)!);
    const currentWeekStart = selectedWeekDates[0]!;
    const currentWeekEnd = nextDate(selectedWeekDates.at(-1)!);
    const needsSeparateWeek =
      currentWeekStart < startDate || currentWeekEnd > endExclusive;
    const [
      profileResult,
      goalResult,
      platformsResult,
      categoriesResult,
      earningsResult,
      expensesResult,
      fuelResult,
      receiptsResult,
      weekEarningsResult,
      weekExpensesResult,
      weekFuelResult,
      weekReceiptsResult,
      shiftsResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single(),
      supabase
        .from("goals")
        .select("weekly_income")
        .eq("user_id", user.id)
        .maybeSingle(),
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
      needsSeparateWeek
        ? supabase
            .from("earnings")
            .select("*")
            .eq("user_id", user.id)
            .gte("date", currentWeekStart)
            .lt("date", currentWeekEnd)
        : Promise.resolve({ data: [], error: null }),
      needsSeparateWeek
        ? supabase
            .from("expenses")
            .select("*")
            .eq("user_id", user.id)
            .gte("occurred_at", `${currentWeekStart}T00:00:00-05:00`)
            .lt("occurred_at", `${currentWeekEnd}T00:00:00-05:00`)
        : Promise.resolve({ data: [], error: null }),
      needsSeparateWeek
        ? supabase
            .from("fuel_refills")
            .select("*")
            .eq("user_id", user.id)
            .gte("occurred_at", `${currentWeekStart}T00:00:00-05:00`)
            .lt("occurred_at", `${currentWeekEnd}T00:00:00-05:00`)
        : Promise.resolve({ data: [], error: null }),
      needsSeparateWeek
        ? supabase
            .from("payment_receipts")
            .select("*")
            .eq("user_id", user.id)
            .gte("occurred_at", `${currentWeekStart}T00:00:00-05:00`)
            .lt("occurred_at", `${currentWeekEnd}T00:00:00-05:00`)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("work_shifts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("started_at", `${currentWeekStart}T00:00:00-05:00`)
        .lt("ended_at", `${currentWeekEnd}T00:00:00-05:00`),
    ]);

    if (
      profileResult.error ||
      platformsResult.error ||
      categoriesResult.error ||
      earningsResult.error ||
      expensesResult.error ||
      fuelResult.error ||
      receiptsResult.error ||
      weekEarningsResult.error ||
      weekExpensesResult.error ||
      weekFuelResult.error ||
      weekReceiptsResult.error ||
      shiftsResult.error
    ) {
      throw new Error("No pudimos cargar tus reportes.");
    }

    const allReceipts = uniqueRows([
      ...(receiptsResult.data as PaymentReceipt[]),
      ...(weekReceiptsResult.data as PaymentReceipt[]),
    ]);
    const linkedShiftIds = [
      ...new Set(allReceipts.map((receipt) => receipt.shift_id).filter((id): id is string => id !== null)),
    ];
    const linkedEarningsResult = linkedShiftIds.length
      ? await supabase
          .from("earnings")
          .select("*")
          .eq("user_id", user.id)
          .in("shift_id", linkedShiftIds)
      : { data: [], error: null };
    if (linkedEarningsResult.error)
      throw new Error("No pudimos cargar tus reportes.");

    const sources = {
      categories: categoriesResult.data as ExpenseCategory[],
      earnings: uniqueRows([
        ...(earningsResult.data as Earning[]),
        ...(weekEarningsResult.data as Earning[]),
        ...(linkedEarningsResult.data as Earning[]),
      ]),
      expenses: uniqueRows([
        ...(expensesResult.data as Expense[]),
        ...(weekExpensesResult.data as Expense[]),
      ]),
      fuel: uniqueRows([
        ...(fuelResult.data as FuelRefill[]),
        ...(weekFuelResult.data as FuelRefill[]),
      ]),
      receipts: allReceipts,
      platforms: platformsResult.data as UserPlatform[],
    };
    const selectedShifts = shiftsResult.data as WorkShift[];
    const pauseResult = selectedShifts.length
      ? await supabase
          .from("shift_pauses")
          .select("*")
          .eq("user_id", user.id)
          .in(
            "shift_id",
            selectedShifts.map((shift) => shift.id),
          )
      : { data: [], error: null };
    if (pauseResult.error) throw new Error("No pudimos cargar tus reportes.");
    return {
      anchorDate,
      day: buildReportPeriod(sources, dayDates),
      month: buildReportPeriod(sources, monthDates),
      name: (profileResult.data as Pick<Profile, "display_name">).display_name,
      selectedWeek: buildReportPeriod(sources, selectedWeekDates),
      selectedWeekDate,
      todayDate,
      week: buildReportPeriod(sources, weekDates),
      weeklyGoal: goalResult.error
        ? null
        : (goalResult.data?.weekly_income ?? null),
      productivity: calculateWeeklyProductivity({
        shifts: selectedShifts,
        pauses: pauseResult.data as ShiftPause[],
        earnings: sources.earnings,
        receipts: sources.receipts,
        expenses: sources.expenses,
        fuel: sources.fuel,
        categories: sources.categories,
      }),
    };
  },
);

function uniqueRows<T extends { id: string }>(rows: T[]): T[] {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

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
