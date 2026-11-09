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

export const getExpensesWorkspace = cache(
  async (editExpenseId?: string, editFuelId?: string) => {
    const user = await requireUser();
    const supabase = await createClient();
    const [
      categoriesResult,
      expensesResult,
      recurringResult,
      fuelResult,
      settingsResult,
      activeShiftResult,
      editExpenseResult,
      editFuelResult,
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
      isUuid(editExpenseId)
        ? supabase
            .from("expenses")
            .select("*")
            .eq("user_id", user.id)
            .eq("id", editExpenseId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      isUuid(editFuelId)
        ? supabase
            .from("fuel_refills")
            .select("*")
            .eq("user_id", user.id)
            .eq("id", editFuelId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (
      categoriesResult.error ||
      expensesResult.error ||
      recurringResult.error ||
      fuelResult.error ||
      settingsResult.error ||
      activeShiftResult.error ||
      editExpenseResult.error ||
      editFuelResult.error
    ) {
      throw new Error("No pudimos cargar tus gastos.");
    }
    const categories = categoriesResult.data as ExpenseCategory[];
    const byCategory = new Map(
      categories.map((category) => [category.id, category]),
    );
    const expenseRows = expensesResult.data as Expense[];
    const fuelRows = fuelResult.data as FuelRefill[];
    const requestedExpense = editExpenseResult.data as Expense | null;
    const requestedFuel = editFuelResult.data as FuelRefill | null;
    if (
      requestedExpense &&
      !expenseRows.some((row) => row.id === requestedExpense.id)
    )
      expenseRows.push(requestedExpense);
    if (requestedFuel && !fuelRows.some((row) => row.id === requestedFuel.id))
      fuelRows.push(requestedFuel);
    return {
      userId: user.id,
      categories,
      expenses: expenseRows.map((expense) => ({
        ...expense,
        categoryName: byCategory.get(expense.category_id)?.name ?? "Categoría",
        categoryKind: byCategory.get(expense.category_id)?.kind ?? "personal",
      })),
      recurring: (recurringResult.data as RecurringExpense[]).map((rule) => ({
        ...rule,
        categoryName: byCategory.get(rule.category_id)?.name ?? "Categoría",
      })),
      fuel: fuelRows,
      ruc: settingsResult.data.ruc,
      activeShiftId: activeShiftResult.data?.id ?? null,
    };
  },
);

function isUuid(value: string | undefined): value is string {
  return (
    !!value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
