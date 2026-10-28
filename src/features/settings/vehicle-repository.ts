import "server-only";
import { createClient } from "@/lib/supabase/server";

type VehicleInput = {
  userId: string;
  name: string;
  odometerKm: number | null;
};

export async function saveOwnVehicle({
  userId,
  name,
  odometerKm,
}: VehicleInput) {
  const supabase = await createClient();

  const { data: updatedVehicle, error: updateError } = await supabase
    .from("vehicles")
    .update({ name, odometer_km: odometerKm })
    .eq("user_id", userId)
    .select("user_id");
  if (updateError || updatedVehicle?.length) return { error: updateError };

  return supabase.from("vehicles").insert({
    user_id: userId,
    name,
    odometer_km: odometerKm,
  });
}
