import type { Earning } from "@/types/database";

const moneyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
  return moneyFormatter.format(cents / 100);
}
