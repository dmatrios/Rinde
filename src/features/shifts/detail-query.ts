import "server-only";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { decimalToCents, earningGrossCents } from "@/lib/finance/money";
import type {
  Earning,
  Expense,
  ExpenseCategory,
  FuelRefill,
  PaymentReceipt,
  ShiftPause,
  UserPlatform,
  WorkShift,
} from "@/types/database";

export type ShiftMovement = {
  id: string;
  kind: "receipt" | "expense" | "fuel";
  title: string;
  occurredAt: string;
  cents: number;
  editHref?: string;
};

export async function getShiftDetail(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return null;
  const user = await requireUser();
  const supabase = await createClient();
  const { data: shift, error: shiftError } = await supabase
    .from("work_shifts")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
  if (shiftError) throw new Error("No pudimos cargar esta jornada.");
  if (!shift) return null;

  const [
    platform,
    pauses,
    earnings,
    receipts,
    expenses,
    fuel,
    categories,
    balance,
  ] = await Promise.all([
    supabase
      .from("user_platforms")
      .select("*")
      .eq("user_id", user.id)
      .eq("id", shift.platform_id)
      .single(),
    supabase
      .from("shift_pauses")
      .select("*")
      .eq("user_id", user.id)
      .eq("shift_id", id)
      .order("started_at"),
    supabase
      .from("earnings")
      .select("*")
      .eq("user_id", user.id)
      .eq("shift_id", id),
    supabase
      .from("payment_receipts")
      .select("*")
      .eq("user_id", user.id)
      .eq("shift_id", id)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .eq("shift_id", id)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("fuel_refills")
      .select("*")
      .eq("user_id", user.id)
      .eq("shift_id", id)
      .order("occurred_at", { ascending: false }),
    supabase.from("expense_categories").select("*").eq("user_id", user.id),
    supabase.rpc("get_shift_cash_balance", { p_shift_id: id }),
  ]);
  if (
    platform.error ||
    pauses.error ||
    earnings.error ||
    receipts.error ||
    expenses.error ||
    fuel.error ||
    categories.error ||
    balance.error
  )
    throw new Error("No pudimos cargar el detalle de esta jornada.");

  const [dailyResult, unlinkedResult] = await Promise.all([
    supabase
      .from("earnings")
      .select("id")
      .eq("user_id", user.id)
      .eq("platform_id", shift.platform_id)
      .eq("date", limaDate(shift.started_at))
      .eq("mode", "daily")
      .limit(1),
    shift.status === "completed" && shift.ended_at
      ? supabase
          .from("payment_receipts")
          .select("*")
          .eq("user_id", user.id)
          .eq("platform_id", shift.platform_id)
          .is("shift_id", null)
          .gte("occurred_at", shift.started_at)
          .lte("occurred_at", shift.ended_at)
          .order("occurred_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (dailyResult.error || unlinkedResult.error)
    throw new Error("No pudimos cargar los cobros de esta jornada.");

  const categoryNames = new Map(
    (categories.data as ExpenseCategory[]).map((category) => [
      category.id,
      category.name,
    ]),
  );
  const incomeRecords = earnings.data as Earning[];
  const receiptRecords = receipts.data as PaymentReceipt[];
  const expenseRecords = expenses.data as Expense[];
  const fuelRecords = fuel.data as FuelRefill[];
  const grossCents = incomeRecords.reduce(
    (total, earning) => total + earningGrossCents(earning),
    0,
  );
  const expensesCents =
    expenseRecords.reduce(
      (total, expense) => total + decimalToCents(expense.amount),
      0,
    ) +
    fuelRecords.reduce(
      (total, refill) => total + decimalToCents(refill.amount),
      0,
    );
  const movements: ShiftMovement[] = [
    ...receiptRecords.map((receipt) => ({
      id: receipt.id,
      kind: "receipt" as const,
      title: "Cobro",
      occurredAt: receipt.occurred_at,
      cents: decimalToCents(receipt.amount),
    })),
    ...expenseRecords.map((expense) => ({
      id: expense.id,
      kind: "expense" as const,
      title:
        expense.description ||
        categoryNames.get(expense.category_id) ||
        "Gasto",
      occurredAt: expense.occurred_at,
      cents: decimalToCents(expense.amount),
      editHref: `/app/expenses?edit=${expense.id}`,
    })),
    ...fuelRecords.map((refill) => ({
      id: refill.id,
      kind: "fuel" as const,
      title: "Combustible",
      occurredAt: refill.occurred_at,
      cents: decimalToCents(refill.amount),
      editHref: `/app/expenses?editFuel=${refill.id}`,
    })),
  ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  return {
    shift: shift as WorkShift,
    platform: platform.data as UserPlatform,
    pauses: pauses.data as ShiftPause[],
    cashBalance: Number(balance.data ?? 0),
    grossCents,
    shiftEarningCents: incomeRecords.length
      ? incomeRecords.reduce(
          (total, earning) => total + earningGrossCents(earning),
          0,
        )
      : null,
    hasDailyEarning: dailyResult.data.length > 0,
    linkedReceipts: receiptRecords,
    unlinkedReceipts: unlinkedResult.data as PaymentReceipt[],
    expensesCents,
    orders:
      incomeRecords.reduce(
        (total, earning) => total + (earning.orders ?? 0),
        0,
      ) || receiptRecords.length,
    movements,
  };
}

function limaDate(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
