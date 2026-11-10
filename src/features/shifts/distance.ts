import type { ShiftPause, WorkShift } from "@/types/database";

/** Distance covered while the shift clock was running. */
export function workDistanceKm(
  shift: Pick<WorkShift, "odometer_start" | "odometer_end">,
  pauses: Array<
    Pick<
      ShiftPause,
      "started_at" | "ended_at" | "odometer_pause" | "odometer_resume"
    >
  >,
): number | null {
  if (shift.odometer_start == null || shift.odometer_end == null) return null;
  let cursor = shift.odometer_start;
  let distance = 0;
  for (const pause of [...pauses].sort((left, right) =>
    left.started_at.localeCompare(right.started_at),
  )) {
    if (pause.odometer_pause == null || pause.odometer_pause < cursor)
      return null;
    distance += pause.odometer_pause - cursor;
    if (pause.ended_at) {
      if (
        pause.odometer_resume == null ||
        pause.odometer_resume < pause.odometer_pause
      )
        return null;
      cursor = pause.odometer_resume;
    } else {
      cursor = shift.odometer_end;
    }
  }
  if (shift.odometer_end < cursor) return null;
  return distance + shift.odometer_end - cursor;
}
