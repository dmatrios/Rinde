"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import type { ActionState } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";
import { earningFormSchema } from "@/features/earnings/validation";

const failure = (message: string): ActionState => ({ status: "error", message });
const success = (message: string): ActionState => ({ status: "success", message });

export async function saveEarning(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = earningFormSchema.safeParse({
    earningId: form.get("earningId") || undefined,
    expectedRevision: form.get("expectedRevision") || undefined,
    mode: form.get("mode"),
    platformId: form.get("platformId"),
    shiftId: form.get("shiftId") || undefined,
    date: form.get("date"),
    reportedAmount: form.get("reportedAmount"),
    tips: form.get("tips"),
    bonuses: form.get("bonuses"),
    tipsIncluded: form.get("tipsIncluded") === "true",
    bonusesIncluded: form.get("bonusesIncluded") === "true",
    orders: form.get("orders"),
    notes: form.get("notes"),
  });
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Revisa los datos.");
  }
  if (parsed.data.mode === "daily" && parsed.data.shiftId) {
    return failure("Un ingreso diario no usa una jornada.");
  }
  if (parsed.data.mode === "shift" && !parsed.data.shiftId) {
    return failure("Elige una jornada finalizada.");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("upsert_earning", {
      p_earning_id: parsed.data.earningId ?? null,
      p_platform_id: parsed.data.platformId,
      p_date: parsed.data.date,
      p_mode: parsed.data.mode,
      p_shift_id: parsed.data.shiftId ?? null,
      p_reported_amount: parsed.data.reportedAmount,
      p_tips: parsed.data.tips,
      p_bonuses: parsed.data.bonuses,
      p_tips_included: parsed.data.tipsIncluded,
      p_bonuses_included: parsed.data.bonusesIncluded,
      p_orders: parsed.data.orders ?? null,
      p_notes: parsed.data.notes,
      p_expected_revision: parsed.data.expectedRevision ?? null,
    });
    if (error) {
      if (error.message.includes("updated elsewhere")) {
        return failure("Este ingreso cambió. Recarga la página antes de editarlo.");
      }
      if (error.code === "23505") {
        return failure("Ya tienes un ingreso para esa plataforma y fecha.");
      }
      return failure("No pudimos guardar el ingreso. Inténtalo nuevamente.");
    }
  } catch {
    return failure("No pudimos guardar el ingreso. Inténtalo nuevamente.");
  }

  revalidatePath("/app");
  revalidatePath("/app/earnings");
  return success(parsed.data.earningId ? "Ingreso actualizado." : "Ingreso registrado.");
}
