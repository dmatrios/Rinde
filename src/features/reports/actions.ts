"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import type { ActionState } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";

const goalSchema = z
  .string()
  .trim()
  .regex(/^\d{1,12}(?:\.\d{1,2})?$/, "Ingresa una meta válida.")
  .refine((value) => Number(value) > 0, "La meta debe ser mayor que cero.");

export async function saveWeeklyGoal(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = goalSchema.safeParse(form.get("weeklyGoal"));
  if (!parsed.success)
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa la meta.",
    };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .update({ weekly_income: parsed.data })
    .eq("user_id", user.id)
    .select("user_id")
    .maybeSingle();
  if (error) return { status: "error", message: "No pudimos guardar la meta." };
  if (!data) {
    const created = await supabase
      .from("goals")
      .insert({ user_id: user.id, weekly_income: parsed.data })
      .select("user_id")
      .single();
    if (created.error)
      return { status: "error", message: "No pudimos guardar la meta." };
  }
  revalidatePath("/app/reports");
  return { status: "success", message: "Meta semanal guardada." };
}

export async function removeWeeklyGoal(): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("user_id", user.id);
  if (error) return { status: "error", message: "No pudimos quitar la meta." };
  revalidatePath("/app/reports");
  return { status: "success", message: "Meta semanal quitada." };
}
