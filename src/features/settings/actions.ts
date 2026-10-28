"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import type { ActionState } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";
import { isVehicleOption } from "@/features/settings/vehicle-options";
import { saveOwnVehicle } from "@/features/settings/vehicle-repository";

const rucSchema = z
  .string()
  .trim()
  .regex(/^\d{11}$/, "Ingresa los 11 dígitos de tu RUC.");

const vehicleSchema = z.object({
  name: z
    .string()
    .trim()
    .refine(isVehicleOption, "Elige bicicleta, moto o carro."),
  odometerKm: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .refine(
      (value) => value === null || /^\d{1,7}(?:\.\d)?$/.test(value),
      "Ingresa un kilometraje válido.",
    )
    .transform((value) => (value === null ? null : Number(value)))
    .refine(
      (value) => value === null || value < 10_000_000,
      "Ingresa un kilometraje válido.",
    ),
});

export async function updateRuc(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = rucSchema.safeParse(form.get("ruc"));
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa tu RUC.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_settings")
    .update({ ruc: parsed.data })
    .eq("user_id", user.id);

  if (error) {
    return { status: "error", message: "No pudimos guardar tu RUC." };
  }

  revalidatePath("/app", "layout");
  return { status: "success", message: "Tu RUC se guardó correctamente." };
}

export async function saveVehicle(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = vehicleSchema.safeParse({
    name: form.get("name"),
    odometerKm: form.get("odometerKm"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Revisa los datos del vehículo.",
    };
  }

  const { error } = await saveOwnVehicle({
    userId: user.id,
    name: parsed.data.name,
    odometerKm: parsed.data.odometerKm,
  });

  if (error) {
    return { status: "error", message: "No pudimos guardar tu vehículo." };
  }

  revalidatePath("/app", "layout");
  return { status: "success", message: "Tu vehículo se guardó correctamente." };
}
