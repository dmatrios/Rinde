import "server-only";

import { cache } from "react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseCategory, WorkShift } from "@/types/database";

export const getQuickRegisterData = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const [categoriesResult, shiftsResult] = await Promise.all([
    supabase
      .from("expense_categories")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("work_shifts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(60),
  ]);

  if (categoriesResult.error || shiftsResult.error) {
    throw new Error("No pudimos preparar el registro rápido.");
  }

  return {
    categories: categoriesResult.data as ExpenseCategory[],
    shifts: shiftsResult.data as WorkShift[],
  };
});
