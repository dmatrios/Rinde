"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import type { ActionState } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";
import { decimalToCents } from "@/lib/finance/money";
import {
  categorySchema,
  expenseSchema,
  fuelSchema,
  recurringSchema,
} from "@/features/expenses/validation";

const success = (message: string): ActionState => ({
  status: "success",
  message,
});
const failure = (message: string): ActionState => ({
  status: "error",
  message,
});
const unavailable = "No pudimos guardar el cambio. Inténtalo nuevamente.";
const occurredAt = (date: string) => `${date}T12:00:00-05:00`;
const refresh = () => {
  revalidatePath("/app");
  revalidatePath("/app/expenses");
};
const todayInLima = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

async function openShiftId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  date: string,
  include: boolean,
) {
  if (!include) return null;
  if (date !== todayInLima())
    throw new Error(
      "Elige la fecha de hoy para vincular este gasto a la jornada.",
    );
  const { data, error } = await supabase
    .from("work_shifts")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active", "paused"])
    .maybeSingle();
  if (error || !data) throw new Error("No encontramos una jornada en curso.");
  return data.id;
}

async function existingShift(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "expenses" | "fuel_refills",
  userId: string,
  id: string | undefined,
  canChooseShift: boolean,
  date: string,
) {
  if (!id || canChooseShift) return null;
  const { data, error } = await supabase
    .from(table)
    .select("shift_id, occurred_at")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) throw new Error("No encontramos ese movimiento.");
  if (data.shift_id) {
    const originalDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(data.occurred_at));
    if (date !== originalDate)
      throw new Error(
        "No puedes cambiar la fecha de un gasto vinculado a una jornada.",
      );
  }
  return data;
}

export async function saveCategory(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = String(form.get("categoryId") ?? "");
  const parsed = categorySchema.safeParse({
    name: form.get("name"),
    kind: form.get("kind"),
  });
  if (!parsed.success)
    return failure(parsed.error.issues[0]?.message ?? "Revisa la categoría.");
  if (id && !zUuid(id)) return failure("La categoría no es válida.");
  const supabase = await createClient();
  const result = id
    ? await supabase
        .from("expense_categories")
        .update(parsed.data)
        .eq("id", id)
        .eq("user_id", user.id)
    : await supabase
        .from("expense_categories")
        .insert({ user_id: user.id, ...parsed.data })
        .select("id")
        .single();
  const { error } = result;
  if (error?.code === "23505")
    return failure("Ya tienes una categoría con ese nombre.");
  if (error) return failure(unavailable);
  refresh();
  return success(id ? "Categoría actualizada." : "Categoría creada.");
}

export async function setCategoryActive(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = String(form.get("categoryId") ?? "");
  const active = form.get("active") === "true";
  if (!zUuid(id)) return failure("La categoría no es válida.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("expense_categories")
    .update({ active })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return failure(unavailable);
  refresh();
  return success(active ? "Categoría activada." : "Categoría desactivada.");
}

export async function deleteCategory(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = String(form.get("categoryId") ?? "");
  if (!zUuid(id)) return failure("La categoría no es válida.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("expense_categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error?.code === "23503") {
    return failure(
      "No puedes eliminar una categoría con registros. Puedes pausarla para conservarlos.",
    );
  }
  if (error) return failure(unavailable);
  refresh();
  return success("Categoría eliminada.");
}

export async function saveExpense(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = expenseSchema.safeParse({
    id: form.get("id") || undefined,
    categoryId: form.get("categoryId"),
    date: form.get("date"),
    amount: form.get("amount"),
    description: form.get("description"),
    notes: form.get("notes"),
    paidWithRuc: form.get("paidWithRuc") === "true",
    paymentMethod: form.get("paymentMethod"),
    cashPaid: form.get("cashPaid") || "",
    includeShift: form.get("includeShift") === "true",
  });
  if (!parsed.success)
    return failure(parsed.error.issues[0]?.message ?? "Revisa el gasto.");
  if (
    parsed.data.cashPaid &&
    (parsed.data.paymentMethod !== "cash" ||
      decimalToCents(parsed.data.cashPaid) < decimalToCents(parsed.data.amount))
  )
    return failure("El efectivo entregado debe cubrir el gasto.");
  const supabase = await createClient();
  if (parsed.data.paidWithRuc) {
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("ruc")
      .eq("user_id", user.id)
      .single();
    if (settingsError || !settings.ruc)
      return failure("Configura tu RUC antes de registrar este gasto.");
  }
  let shiftId: string | null;
  let preservedOccurredAt: string | null = null;
  try {
    const previous = await existingShift(
      supabase,
      "expenses",
      user.id,
      parsed.data.id,
      form.get("canChooseShift") === "true",
      parsed.data.date,
    );
    preservedOccurredAt = previous?.shift_id ? previous.occurred_at : null;
    shiftId =
      previous?.shift_id ??
      (await openShiftId(
        supabase,
        user.id,
        parsed.data.date,
        parsed.data.includeShift,
      ));
  } catch (error) {
    return failure(error instanceof Error ? error.message : unavailable);
  }
  const values = {
    category_id: parsed.data.categoryId,
    occurred_at:
      preservedOccurredAt ??
      (shiftId ? new Date().toISOString() : occurredAt(parsed.data.date)),
    amount: parsed.data.amount,
    description: parsed.data.description,
    notes: parsed.data.notes || null,
    paid_with_ruc: parsed.data.paidWithRuc,
    payment_method: parsed.data.paymentMethod,
    cash_paid: parsed.data.cashPaid || null,
    shift_id: shiftId,
  };
  const result = parsed.data.id
    ? await supabase
        .from("expenses")
        .update(values)
        .eq("id", parsed.data.id)
        .eq("user_id", user.id)
    : await supabase.from("expenses").insert({ user_id: user.id, ...values });
  if (result.error) return failure(unavailable);
  refresh();
  return success(parsed.data.id ? "Gasto actualizado." : "Gasto registrado.");
}

export async function saveFuelRefill(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = fuelSchema.safeParse({
    id: form.get("id") || undefined,
    date: form.get("date"),
    amount: form.get("amount"),
    liters: form.get("liters"),
    odometerKm: form.get("odometerKm"),
    fullTank: form.get("fullTank") === "true",
    notes: form.get("notes"),
    paymentMethod: form.get("paymentMethod"),
    cashPaid: form.get("cashPaid") || "",
    includeShift: form.get("includeShift") === "true",
  });
  if (!parsed.success)
    return failure(parsed.error.issues[0]?.message ?? "Revisa la recarga.");
  if (
    parsed.data.cashPaid &&
    (parsed.data.paymentMethod !== "cash" ||
      decimalToCents(parsed.data.cashPaid) < decimalToCents(parsed.data.amount))
  )
    return failure("El efectivo entregado debe cubrir la recarga.");
  const supabase = await createClient();
  let shiftId: string | null;
  let preservedOccurredAt: string | null = null;
  try {
    const previous = await existingShift(
      supabase,
      "fuel_refills",
      user.id,
      parsed.data.id,
      form.get("canChooseShift") === "true",
      parsed.data.date,
    );
    preservedOccurredAt = previous?.shift_id ? previous.occurred_at : null;
    shiftId =
      previous?.shift_id ??
      (await openShiftId(
        supabase,
        user.id,
        parsed.data.date,
        parsed.data.includeShift,
      ));
  } catch (error) {
    return failure(error instanceof Error ? error.message : unavailable);
  }
  const values = {
    occurred_at:
      preservedOccurredAt ??
      (shiftId ? new Date().toISOString() : occurredAt(parsed.data.date)),
    amount: parsed.data.amount,
    liters: parsed.data.liters?.toFixed(3) ?? null,
    odometer_km: parsed.data.odometerKm?.toFixed(1) ?? null,
    full_tank: parsed.data.fullTank,
    notes: parsed.data.notes || null,
    payment_method: parsed.data.paymentMethod,
    cash_paid: parsed.data.cashPaid || null,
    shift_id: shiftId,
  };
  const result = parsed.data.id
    ? await supabase
        .from("fuel_refills")
        .update(values)
        .eq("id", parsed.data.id)
        .eq("user_id", user.id)
    : await supabase
        .from("fuel_refills")
        .insert({ user_id: user.id, ...values });
  if (result.error) return failure(unavailable);
  refresh();
  return success(
    parsed.data.id ? "Recarga actualizada." : "Recarga registrada.",
  );
}

export async function saveRecurringExpense(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = recurringSchema.safeParse({
    categoryId: form.get("categoryId"),
    description: form.get("description"),
    amount: form.get("amount"),
    cadence: form.get("cadence"),
    anchorDate: form.get("anchorDate"),
  });
  if (!parsed.success)
    return failure(
      parsed.error.issues[0]?.message ?? "Revisa el gasto frecuente.",
    );
  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_expenses")
    .insert({
      user_id: user.id,
      category_id: parsed.data.categoryId,
      description: parsed.data.description,
      amount: parsed.data.amount,
      cadence: parsed.data.cadence,
      anchor_date: parsed.data.anchorDate,
    });
  if (error) return failure(unavailable);
  refresh();
  return success("Gasto frecuente guardado.");
}

export async function recordRecurringExpense(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const ruleId = String(form.get("ruleId") ?? "");
  const date = String(form.get("date") ?? "");
  if (!zUuid(ruleId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return failure("No pudimos identificar el gasto frecuente.");
  }

  const supabase = await createClient();
  const { data: rule, error: ruleError } = await supabase
    .from("recurring_expenses")
    .select("category_id, description, amount, active")
    .eq("id", ruleId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (ruleError || !rule || !rule.active)
    return failure("Ese gasto frecuente ya no estÃ¡ disponible.");

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    category_id: rule.category_id,
    occurred_at: occurredAt(date),
    amount: String(rule.amount),
    description: rule.description,
    recurring_rule_id: ruleId,
    due_date: date,
  });
  if (error?.code === "23505")
    return failure("Ya registraste este gasto para hoy.");
  if (error) return failure(unavailable);
  refresh();
  return success("Gasto frecuente registrado.");
}

export async function setRecurringExpenseActive(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = String(form.get("ruleId") ?? "");
  const active = form.get("active") === "true";
  if (!zUuid(id)) return failure("El gasto frecuente no es válido.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_expenses")
    .update({ active })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return failure(unavailable);
  refresh();
  return success(
    active ? "Gasto frecuente activado." : "Gasto frecuente pausado.",
  );
}

function zUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
