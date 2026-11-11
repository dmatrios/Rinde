"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import type { ActionState } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";
import { decimalToCents } from "@/lib/finance/money";
import { paymentMethodSchema } from "@/features/expenses/validation";

const money = z
  .string()
  .trim()
  .regex(/^\d{1,12}(?:\.\d{1,2})?$/);
const receiptSchema = z.object({
  platformId: z.string().uuid(),
  shiftId: z.union([z.string().uuid(), z.literal("")]),
  amount: money,
  cashReceived: z.union([money, z.literal("")]),
  paymentMethod: paymentMethodSchema,
  description: z.string().trim().max(120),
});

export async function savePaymentReceipt(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = receiptSchema.safeParse({
    platformId: form.get("platformId"),
    shiftId: form.get("shiftId") || "",
    amount: form.get("amount"),
    cashReceived: form.get("cashReceived") || "",
    paymentMethod: form.get("paymentMethod"),
    description: form.get("description") || "",
  });
  if (!parsed.success)
    return { status: "error", message: "Revisa el monto y la forma de pago." };
  const value = parsed.data;
  const amount = decimalToCents(value.amount);
  const received = value.cashReceived ? decimalToCents(value.cashReceived) : 0;
  if (amount <= 0 || (value.paymentMethod === "cash" && received < amount)) {
    return {
      status: "error",
      message: "El efectivo recibido debe cubrir el cobro.",
    };
  }
  const supabase = await createClient();
  if (value.shiftId) {
    const { data: shift, error } = await supabase
      .from("work_shifts")
      .select("platform_id, status")
      .eq("user_id", user.id)
      .eq("id", value.shiftId)
      .maybeSingle();
    if (
      error ||
      !shift ||
      shift.platform_id !== value.platformId
    ) {
      return { status: "error", message: "Esa jornada ya no está disponible." };
    }
  }
  const { error } = await supabase.from("payment_receipts").insert({
    user_id: user.id,
    platform_id: value.platformId,
    shift_id: value.shiftId || null,
    amount: value.amount,
    payment_method: value.paymentMethod,
    cash_received: value.paymentMethod === "cash" ? value.cashReceived : null,
    description: value.description || null,
  });
  if (error)
    return {
      status: "error",
      message: "No pudimos registrar el cobro. Inténtalo otra vez.",
    };
  revalidatePath("/app");
  revalidatePath("/app/activity");
  if (value.shiftId) revalidatePath(`/app/activity/${value.shiftId}`);
  revalidatePath("/app/earnings");
  revalidatePath("/app/reports");
  return { status: "success", message: "Cobro registrado." };
}

export async function linkReceiptToShift(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    receiptId: z.string().uuid(),
    shiftId: z.string().uuid(),
  }).safeParse({
    receiptId: form.get("receiptId"),
    shiftId: form.get("shiftId"),
  });
  if (!parsed.success)
    return { status: "error", message: "Revisa el cobro y la jornada." };

  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: shift, error: shiftError }, { data: receipt, error: receiptError }] =
    await Promise.all([
      supabase
        .from("work_shifts")
        .select("platform_id, ended_at, status")
        .eq("id", parsed.data.shiftId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("payment_receipts")
        .select("platform_id, shift_id")
        .eq("id", parsed.data.receiptId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
  if (
    shiftError || receiptError || !shift || !receipt ||
    shift.status !== "completed" || !shift.ended_at ||
    receipt.shift_id !== null || receipt.platform_id !== shift.platform_id
  ) {
    return { status: "error", message: "Ese cobro no corresponde a esta jornada." };
  }

  const { data, error } = await supabase
    .from("payment_receipts")
    .update({ shift_id: parsed.data.shiftId })
    .eq("id", parsed.data.receiptId)
    .eq("user_id", user.id)
    .is("shift_id", null)
    .select("id")
    .maybeSingle();
  if (error || !data)
    return { status: "error", message: "No pudimos asociar el cobro. Inténtalo otra vez." };
  revalidatePath("/app");
  revalidatePath("/app/activity");
  revalidatePath(`/app/activity/${parsed.data.shiftId}`);
  revalidatePath(`/app/activity/movement/receipt/${parsed.data.receiptId}`);
  revalidatePath("/app/earnings");
  revalidatePath("/app/reports");
  return { status: "success", message: "Cobro asociado a la jornada." };
}
