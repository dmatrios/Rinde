import { decimalToCents, earningGrossCents } from "@/lib/finance/money";
import type {
  Earning,
  Expense,
  ExpenseCategory,
  FuelRefill,
  PaymentReceipt,
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
  receipts,
  expenses,
  fuel,
  categories,
}: {
  shifts: WorkShift[];
  pauses: ShiftPause[];
  earnings: Earning[];
  receipts: PaymentReceipt[];
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
    const shiftReceipts = receipts.filter(
      (receipt) => receipt.shift_id === shift.id,
    );
    const gross = shiftEarnings.length
      ? shiftEarnings.reduce(
          (sum, earning) => sum + earningGrossCents(earning),
          0,
        )
      : shiftReceipts.reduce(
          (sum, receipt) => sum + decimalToCents(receipt.amount),
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
    const distance = workDistance(shift, shiftPauses);
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

function workDistance(shift: WorkShift, pauses: ShiftPause[]): number | null {
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
