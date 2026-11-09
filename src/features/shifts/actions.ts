"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { ActionState } from "@/lib/auth/types";
import {
  cashCountSchema,
  platformIdSchema,
  platformNameSchema,
  startShiftSchema,
  shiftTransitionSchema,
  shiftTimeCorrectionSchema,
} from "@/features/shifts/validation";
import {
  normalizePlatformName,
  OTHER_PLATFORM_VALUE,
} from "@/features/shifts/platform-options";

const success = (message: string): ActionState => ({
  status: "success",
  message,
});
const failure = (message: string): ActionState => ({
  status: "error",
  message,
});
const unavailable = "No pudimos guardar el cambio. Inténtalo nuevamente.";

function refreshShiftViews() {
  revalidatePath("/app");
  revalidatePath("/app/activity");
  revalidatePath("/app/settings");
}

export async function createPlatform(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const requestedName = form.get("name");
  const name = platformNameSchema.safeParse(
    requestedName === OTHER_PLATFORM_VALUE
      ? form.get("customName")
      : requestedName,
  );
  if (!name.success)
    return failure(name.error.issues[0]?.message ?? "Revisa el nombre.");
  try {
    const supabase = await createClient();
    const { data: existingPlatforms, error: existingError } = await supabase
      .from("user_platforms")
      .select("name")
      .eq("user_id", user.id);
    if (existingError) return failure(unavailable);
    if (
      existingPlatforms.some(
        (platform) =>
          normalizePlatformName(platform.name) ===
          normalizePlatformName(name.data),
      )
    ) {
      return failure("Ya agregaste esta plataforma.");
    }
    const { error } = await supabase
      .from("user_platforms")
      .insert({ user_id: user.id, name: name.data })
      .select("id")
      .single();
    if (error?.code === "23505")
      return failure("Ya agregaste esta plataforma.");
    if (error) return failure(unavailable);
  } catch {
    return failure(unavailable);
  }
  refreshShiftViews();
  return success("Plataforma agregada.");
}

export async function updatePlatform(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = platformIdSchema.safeParse(form.get("platformId"));
  const name = platformNameSchema.safeParse(form.get("name"));
  if (!id.success || !name.success)
    return failure("Revisa el nombre de la plataforma.");
  try {
    const supabase = await createClient();
    const { data: existingPlatforms, error: existingError } = await supabase
      .from("user_platforms")
      .select("id, name")
      .eq("user_id", user.id);
    if (existingError) return failure(unavailable);
    if (
      existingPlatforms.some(
        (platform) =>
          platform.id !== id.data &&
          normalizePlatformName(platform.name) ===
            normalizePlatformName(name.data),
      )
    ) {
      return failure("Ya agregaste esta plataforma.");
    }
    const { error } = await supabase
      .from("user_platforms")
      .update({ name: name.data })
      .eq("id", id.data)
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (error?.code === "23505")
      return failure("Ya agregaste esta plataforma.");
    if (error) return failure(unavailable);
  } catch {
    return failure(unavailable);
  }
  refreshShiftViews();
  return success("Nombre actualizado.");
}

export async function setPlatformActive(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = platformIdSchema.safeParse(form.get("platformId"));
  const active = form.get("active") === "true";
  let platformName = "";
  if (!id.success) return failure("La plataforma no es válida.");
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_platforms")
      .update({ active })
      .eq("id", id.data)
      .eq("user_id", user.id)
      .select("name")
      .single();
    if (error) return failure(unavailable);
    if (!data) return failure(unavailable);
    platformName = data.name;
  } catch {
    return failure(unavailable);
  }
  refreshShiftViews();
  return success(
    active
      ? `Conectado a ${platformName}.`
      : `Desconectado de ${platformName}.`,
  );
}

export async function deletePlatform(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = platformIdSchema.safeParse(form.get("platformId"));
  if (!id.success) return failure("La plataforma no es válida.");
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("user_platforms")
      .delete()
      .eq("id", id.data)
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (error?.code === "23503") {
      return failure(
        "No puedes eliminarla porque tiene jornadas registradas. Desconéctala en su lugar.",
      );
    }
    if (error) return failure(unavailable);
  } catch {
    return failure(unavailable);
  }
  refreshShiftViews();
  return success("Plataforma eliminada.");
}

export async function startShift(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = startShiftSchema.safeParse({
    platformId: form.get("platformId"),
    odometerStart: form.get("odometerStart"),
    openingCash: form.get("openingCash") || "0",
  });
  if (!parsed.success)
    return failure(parsed.error.issues[0]?.message ?? "Revisa los datos.");
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("start_work_shift", {
      p_platform_id: parsed.data.platformId,
      p_odometer_start: parsed.data.odometerStart,
      p_opening_cash: parsed.data.openingCash,
    });
    if (error) {
      if (error.message.includes("open shift"))
        return failure("Ya tienes una jornada en curso.");
      return failure(
        "No se pudo iniciar la jornada. Revisa la plataforma elegida.",
      );
    }
  } catch {
    return failure(unavailable);
  }
  refreshShiftViews();
  return success("Jornada iniciada.");
}

export async function transitionShift(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = shiftTransitionSchema.safeParse({
    shiftId: form.get("shiftId"),
    action: form.get("action"),
    odometerEnd: form.get("odometerEnd") ?? "",
  });
  if (!parsed.success) return failure("La jornada no es válida.");
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("transition_work_shift", {
      p_shift_id: parsed.data.shiftId,
      p_action: parsed.data.action,
      p_odometer_end: parsed.data.odometerEnd,
    });
    if (error?.message.includes("ending odometer must not be lower")) {
      return failure(
        "El kilometraje final debe ser igual o mayor al kilometraje inicial.",
      );
    }
    if (error?.message.includes("ending odometer required")) {
      return failure("Ingresa el kilometraje con el que terminaste.");
    }
    if (error?.message.includes("odometer required before pausing")) {
      return failure("Ingresa el kilometraje antes de pausar.");
    }
    if (error?.message.includes("odometer required before resuming")) {
      return failure("Ingresa el kilometraje antes de reanudar.");
    }
    if (error?.message.includes("odometer cannot be lower")) {
      return failure(
        "El kilometraje no puede ser menor que la última lectura.",
      );
    }
    if (error)
      return failure("No pudimos actualizar la jornada. Inténtalo de nuevo.");
  } catch {
    return failure(unavailable);
  }
  refreshShiftViews();
  return success(
    parsed.data.action === "pause"
      ? "Jornada pausada."
      : parsed.data.action === "resume"
        ? "Jornada reanudada."
        : "Jornada finalizada.",
  );
}

export async function correctShiftTime(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = shiftTimeCorrectionSchema.safeParse({
    shiftId: form.get("shiftId"),
    startTime: form.get("startTime"),
    endTime: form.get("endTime"),
    confirmed: form.get("confirmed") === "true",
  });
  if (!parsed.success)
    return failure(parsed.error.issues[0]?.message ?? "Revisa los horarios.");

  const supabase = await createClient();
  const { data: shift, error: shiftError } = await supabase
    .from("work_shifts")
    .select("started_at, ended_at, status")
    .eq("id", parsed.data.shiftId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (shiftError || !shift || shift.status !== "completed" || !shift.ended_at)
    return failure("Esta jornada no se puede corregir.");

  const startDate = limaDate(shift.started_at);
  const endDate = limaDate(shift.ended_at);
  const nextStart = new Date(`${startDate}T${parsed.data.startTime}:00-05:00`);
  const nextEnd = new Date(`${endDate}T${parsed.data.endTime}:00-05:00`);
  if (nextEnd <= nextStart)
    return failure("La hora de fin debe ser posterior al inicio.");
  if (nextEnd.getTime() > Date.now() + 60_000)
    return failure("La hora de fin no puede estar en el futuro.");

  const { data: pauses, error: pausesError } = await supabase
    .from("shift_pauses")
    .select("started_at, ended_at")
    .eq("shift_id", parsed.data.shiftId)
    .eq("user_id", user.id);
  if (pausesError) return failure(unavailable);
  if (
    pauses.some(
      (pause) =>
        !pause.ended_at ||
        new Date(pause.started_at) < nextStart ||
        new Date(pause.ended_at) > nextEnd,
    )
  )
    return failure("Las horas deben incluir todas las pausas de la jornada.");

  const { error } = await supabase
    .from("work_shifts")
    .update({
      started_at: nextStart.toISOString(),
      ended_at: nextEnd.toISOString(),
    })
    .eq("id", parsed.data.shiftId)
    .eq("user_id", user.id)
    .eq("status", "completed")
    .select("id")
    .single();
  if (error) return failure(unavailable);
  refreshShiftViews();
  revalidatePath(`/app/activity/${parsed.data.shiftId}`);
  return success("Horario de la jornada actualizado.");
}

export async function saveCashCount(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = cashCountSchema.safeParse({
    shiftId: form.get("shiftId"),
    countedCash: form.get("countedCash"),
  });
  if (!parsed.success)
    return failure(
      parsed.error.issues[0]?.message ?? "Revisa el efectivo contado.",
    );

  const supabase = await createClient();
  const { error } = await supabase
    .from("work_shifts")
    .update({
      cash_counted: parsed.data.countedCash,
      cash_counted_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.shiftId)
    .eq("user_id", user.id)
    .eq("status", "completed")
    .select("id")
    .single();
  if (error) return failure("No pudimos guardar el efectivo contado.");
  revalidatePath(`/app/activity/${parsed.data.shiftId}`);
  return success("Arqueo guardado.");
}

function limaDate(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
