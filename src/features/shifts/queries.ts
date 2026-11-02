import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ShiftPause, UserPlatform, WorkShift } from "@/types/database";

export type ShiftDetails = WorkShift & {
  cashBalance: number;
  platform: UserPlatform;
  pauses: ShiftPause[];
};
export type CompletedShift = WorkShift & { platformName: string };

export const getShiftWorkspace = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const [platformsResult, shiftsResult] = await Promise.all([
    supabase
      .from("user_platforms")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("work_shifts")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(12),
  ]);

  if (platformsResult.error || shiftsResult.error) {
    throw new Error("No pudimos cargar tus jornadas.");
  }

  const openShift = shiftsResult.data.find(
    (shift) => shift.status === "active" || shift.status === "paused",
  );
  const pausesResult = openShift
    ? await supabase
        .from("shift_pauses")
        .select("*")
        .eq("user_id", user.id)
        .eq("shift_id", openShift.id)
        .order("started_at")
    : { data: [], error: null };
  const balanceResult = openShift
    ? await supabase.rpc("get_shift_cash_balance", { p_shift_id: openShift.id })
    : { data: 0, error: null };

  if (pausesResult.error || balanceResult.error)
    throw new Error("No pudimos cargar tu jornada.");

  const platforms = platformsResult.data;
  const platformById = new Map(
    platforms.map((platform) => [platform.id, platform]),
  );
  const currentPlatform = openShift
    ? platformById.get(openShift.platform_id)
    : null;
  if (openShift && !currentPlatform) {
    throw new Error("No encontramos la plataforma de tu jornada activa.");
  }
  const current: ShiftDetails | null =
    openShift && currentPlatform
      ? {
          ...openShift,
          cashBalance: Number(balanceResult.data ?? 0),
          platform: currentPlatform,
          pauses: pausesResult.data,
        }
      : null;

  return {
    platforms,
    activePlatforms: platforms.filter((platform) => platform.active),
    current,
    history: shiftsResult.data
      .filter((shift) => shift.status === "completed")
      .map((shift) => ({
        ...shift,
        platformName: platformById.get(shift.platform_id)?.name ?? "Plataforma",
      })),
  };
});
