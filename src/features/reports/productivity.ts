import { decimalToCents, earningGrossCents } from "@/lib/finance/money";
import { workDistanceKm } from "@/features/shifts/distance";
import type {
  Earning,
  Expense,
  ExpenseCategory,
  FuelRefill,
  ShiftPause,
  WorkShift,
} from "@/types/database";

export type WeeklyProductivity = {
  hourlyCents: number | null;
  perKmCents: number | null;
  minutes: number;
  kilometers: number;
  shiftsWithTime: number;
  shiftsWithDistance: number;
};

export function calculateWeeklyProductivity({
  shifts,
  pauses,
  earnings,
  expenses,
  fuel,
  categories,
}: {
  shifts: WorkShift[];
  pauses: ShiftPause[];
  earnings: Earning[];
  expenses: Expense[];
  fuel: FuelRefill[];
  categories: ExpenseCategory[];
}): WeeklyProductivity {
  const operationalIds = new Set(
    categories
      .filter((category) => category.kind === "operational")
      .map((category) => category.id),
  );
  let minutes = 0;
  let hourlyResult = 0;
  let kilometers = 0;
  let distanceResult = 0;
  let shiftsWithTime = 0;
  let shiftsWithDistance = 0;

  for (const shift of shifts) {
    if (!shift.ended_at) continue;
    const shiftEarnings = earnings.filter(
      (earning) => earning.shift_id === shift.id,
    );
    const gross = shiftEarnings.reduce(
      (sum, earning) => sum + earningGrossCents(earning),
      0,
    );
    if (gross <= 0) continue;
    const operational = expenses
      .filter(
        (expense) =>
          expense.shift_id === shift.id &&
          operationalIds.has(expense.category_id),
      )
      .reduce((sum, expense) => sum + decimalToCents(expense.amount), 0);
    const fuelCost = fuel
      .filter((refill) => refill.shift_id === shift.id)
      .reduce((sum, refill) => sum + decimalToCents(refill.amount), 0);
    const result = gross - operational - fuelCost;
    const shiftPauses = pauses.filter((pause) => pause.shift_id === shift.id);
    const pausedMs = shiftPauses.reduce(
      (sum, pause) =>
        sum +
        (new Date(pause.ended_at ?? shift.ended_at!).getTime() -
          new Date(pause.started_at).getTime()),
      0,
    );
    const effective = Math.max(
      0,
      (new Date(shift.ended_at).getTime() -
        new Date(shift.started_at).getTime() -
        pausedMs) /
        60_000,
    );
    if (effective > 0) {
      minutes += effective;
      hourlyResult += result;
      shiftsWithTime++;
    }
    const distance = workDistanceKm(shift, shiftPauses);
    if (distance !== null && distance > 0) {
      kilometers += distance;
      distanceResult += result;
      shiftsWithDistance++;
    }
  }

  return {
    hourlyCents: minutes > 0 ? Math.round((hourlyResult * 60) / minutes) : null,
    perKmCents: kilometers > 0 ? Math.round(distanceResult / kilometers) : null,
    minutes,
    kilometers,
    shiftsWithTime,
    shiftsWithDistance,
  };
}
