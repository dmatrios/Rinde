import "server-only";

import { cache } from "react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { decimalToCents, earningGrossCents } from "@/lib/finance/money";
import type { PaymentMethod } from "@/types/database";

export type Movement = {
  id: string;
  date: string;
  title: string;
  kind: "receipt" | "earning" | "expense" | "fuel";
  cents: number;
  method: PaymentMethod | null;
  shiftId: string | null;
  detail: string | null;
  cashReceivedCents: number | null;
};

export const getMovements = cache(async (): Promise<Movement[]> => {
  const user = await requireUser();
  const supabase = await createClient();
  const [receipts, earnings, expenses, fuel, categories, platforms] =
    await Promise.all([
      supabase
        .from("payment_receipts")
        .select("*")
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(60),
      supabase
        .from("earnings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(60),
      supabase
        .from("fuel_refills")
        .select("*")
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(60),
      supabase
        .from("expense_categories")
        .select("id, name")
        .eq("user_id", user.id),
      supabase.from("user_platforms").select("id, name").eq("user_id", user.id),
    ]);
  if (
    receipts.error ||
    earnings.error ||
    expenses.error ||
    fuel.error ||
    categories.error ||
    platforms.error
  ) {
    throw new Error("No pudimos cargar tus movimientos.");
  }
  const categoryNames = new Map(
    categories.data.map((category) => [category.id, category.name]),
  );
  const platformNames = new Map(
    platforms.data.map((platform) => [platform.id, platform.name]),
  );
  const all: Movement[] = [
    ...receipts.data.map((receipt): Movement => {
      return {
        id: receipt.id,
        date: receipt.occurred_at,
        title:
          receipt.description ||
          `Cobro de ${platformNames.get(receipt.platform_id) ?? "plataforma"}`,
        kind: "receipt",
        cents: decimalToCents(receipt.amount),
        method: receipt.payment_method,
        shiftId: receipt.shift_id,
        detail: platformNames.get(receipt.platform_id) ?? null,
        cashReceivedCents:
          receipt.cash_received == null
            ? null
            : decimalToCents(receipt.cash_received),
      };
    }),
    ...earnings.data.map((earning): Movement => ({
      id: earning.id,
      date: earning.created_at,
      title: `Ingreso total · ${platformNames.get(earning.platform_id) ?? "Plataforma"}`,
      kind: "earning",
      cents: earningGrossCents(earning),
      method: null,
      shiftId: earning.shift_id,
      detail: earning.notes,
      cashReceivedCents: null,
    })),
    ...expenses.data.map((expense): Movement => ({
      id: expense.id,
      date: expense.occurred_at,
      title: expense.description,
      kind: "expense",
      cents: decimalToCents(expense.amount),
      method: expense.payment_method,
      shiftId: expense.shift_id,
      detail:
        [categoryNames.get(expense.category_id), expense.notes]
          .filter(Boolean)
          .join(" · ") || null,
      cashReceivedCents:
        expense.cash_paid == null ? null : decimalToCents(expense.cash_paid),
    })),
    ...fuel.data.map((refill): Movement => ({
      id: refill.id,
      date: refill.occurred_at,
      title: "Recarga de combustible",
      kind: "fuel",
      cents: decimalToCents(refill.amount),
      method: refill.payment_method,
      shiftId: refill.shift_id,
      detail: refill.notes,
      cashReceivedCents:
        refill.cash_paid == null ? null : decimalToCents(refill.cash_paid),
    })),
  ];
  return all
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 80);
});
