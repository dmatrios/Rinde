"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { saveOwnVehicle } from "@/features/settings/vehicle-repository";
import { isVehicleOption } from "@/features/settings/vehicle-options";
import {
  normalizePlatformName,
  PLATFORM_PRESETS,
} from "@/features/shifts/platform-options";
import type { ActionState } from "@/lib/auth/types";

const schema = z
  .object({
    vehicle: z.string().refine(isVehicleOption, "Elige tu vehículo."),
    odometer: z
      .string()
      .trim()
      .transform((value) => (value === "" ? null : value))
      .refine(
        (value) => value === null || /^\d{1,7}(?:\.\d)?$/.test(value),
        "Ingresa un kilometraje válido.",
      )
      .transform((value) => (value === null ? null : Number(value))),
    platforms: z
      .array(z.enum(PLATFORM_PRESETS))
      .min(1, "Elige al menos una plataforma.")
      .refine(
        (platforms) => new Set(platforms).size === platforms.length,
        "Elige cada plataforma una sola vez.",
      ),
  })
  .superRefine(({ odometer, vehicle }, context) => {
    if (vehicle !== "Bicicleta" && odometer === null) {
      context.addIssue({
        code: "custom",
        message: "Ingresa el kilometraje actual.",
        path: ["odometer"],
      });
    }
  });

export async function completeOnboarding(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({
    vehicle: form.get("vehicle"),
    odometer: form.get("odometer"),
    platforms: form.getAll("platform"),
  });
  if (!parsed.success)
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa tus datos.",
    };
  const user = await requireUser();
  const { error: vehicleError } = await saveOwnVehicle({
    userId: user.id,
    name: parsed.data.vehicle,
    odometerKm: parsed.data.odometer,
  });
  const supabase = await createClient();
  if (vehicleError)
    return { status: "error", message: "No pudimos guardar tu vehículo." };
  const { data: existingPlatforms, error: existingPlatformsError } =
    await supabase.from("user_platforms").select("name").eq("user_id", user.id);
  if (existingPlatformsError)
    return { status: "error", message: "No pudimos revisar tus plataformas." };

  const existingNames = new Set(
    (existingPlatforms ?? []).map((platform) =>
      normalizePlatformName(platform.name),
    ),
  );
  const platformsToCreate = parsed.data.platforms.filter(
    (name) => !existingNames.has(normalizePlatformName(name)),
  );
  const { error: platformsError } = platformsToCreate.length
    ? await supabase
        .from("user_platforms")
        .insert(platformsToCreate.map((name) => ({ user_id: user.id, name })))
    : { error: null };
  if (platformsError)
    return { status: "error", message: "No pudimos guardar tus plataformas." };
  const { error: settingsError } = await supabase
    .from("user_settings")
    .update({ onboarding_completed: true })
    .eq("user_id", user.id);
  if (settingsError)
    return { status: "error", message: "No pudimos terminar la bienvenida." };
  redirect("/app");
}
