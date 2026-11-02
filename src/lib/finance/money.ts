import type { Earning } from "@/types/database";

export function decimalToCents(value: string | number): number {
  const [whole = "0", fraction = ""] = String(value).trim().split(".");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "") || "0";
  const normalizedFraction = `${fraction}00`.slice(0, 2);
  return Number(normalizedWhole) * 100 + Number(normalizedFraction);
}

export function earningGrossCents(
  earning: Pick<
    Earning,
    | "reported_amount"
    | "tips"
    | "bonuses"
    | "tips_included"
    | "bonuses_included"
  >,
): number {
  return (
    decimalToCents(earning.reported_amount) +
    (earning.tips_included ? 0 : decimalToCents(earning.tips)) +
    (earning.bonuses_included ? 0 : decimalToCents(earning.bonuses))
  );
}

export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "−" : "";
  const absolute = Math.abs(cents);
  const whole = String(Math.floor(absolute / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ",",
  );
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${sign}S/ ${whole}.${fraction}`;
}
