import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
export const getAccount = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const [profile, settings, platforms, vehicle] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
    supabase
      .from("user_platforms")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
    supabase.from("vehicles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  if (profile.error || settings.error || platforms.error || vehicle.error)
    throw new Error(
      "No pudimos cargar tu cuenta. Comprueba la conexión y que la migración inicial esté aplicada.",
    );
  return {
    user,
    profile: profile.data,
    settings: settings.data,
    platforms: platforms.data,
    vehicle: vehicle.data,
  };
});
