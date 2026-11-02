import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type {
  Expense,
  ExpenseCategory,
  FuelRefill,
  RecurringExpense,
} from "@/types/database";

export type ExpenseRecord = Expense & {
  categoryName: string;
  categoryKind: ExpenseCategory["kind"];
};
export type RecurringRecord = RecurringExpense & { categoryName: string };

export const getExpensesWorkspace = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const [
    categoriesResult,
    expensesResult,
    recurringResult,
    fuelResult,
    settingsResult,
    activeShiftResult,
  ] = await Promise.all([
    supabase
      .from("expense_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false })
      .limit(60),
    supabase
      .from("recurring_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("anchor_date")
      .limit(30),
    supabase
      .from("fuel_refills")
      .select("*")
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false })
      .limit(30),
    supabase
      .from("user_settings")
      .select("ruc")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("work_shifts")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["active", "paused"])
      .maybeSingle(),
  ]);
  if (
    categoriesResult.error ||
    expensesResult.error ||
    recurringResult.error ||
    fuelResult.error ||
    settingsResult.error ||
    activeShiftResult.error
  ) {
    throw new Error("No pudimos cargar tus gastos.");
  }
  const categories = categoriesResult.data as ExpenseCategory[];
  const byCategory = new Map(
    categories.map((category) => [category.id, category]),
  );
  return {
    categories,
    expenses: (expensesResult.data as Expense[]).map((expense) => ({
      ...expense,
      categoryName: byCategory.get(expense.category_id)?.name ?? "Categoría",
      categoryKind: byCategory.get(expense.category_id)?.kind ?? "personal",
    })),
    recurring: (recurringResult.data as RecurringExpense[]).map((rule) => ({
      ...rule,
      categoryName: byCategory.get(rule.category_id)?.name ?? "Categoría",
    })),
    fuel: fuelResult.data as FuelRefill[],
    ruc: settingsResult.data.ruc,
    activeShiftId: activeShiftResult.data?.id ?? null,
  };
});
