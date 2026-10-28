export type ReportRange = "day" | "week" | "month";

export function isBusinessDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

export function addPeriod(date: string, range: ReportRange, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  if (range === "day") value.setUTCDate(value.getUTCDate() + amount);
  if (range === "week") value.setUTCDate(value.getUTCDate() + amount * 7);
  if (range === "month") value.setUTCMonth(value.getUTCMonth() + amount);
  return value.toISOString().slice(0, 10);
}

export function datesForWeek(anchor: string) {
  const start = new Date(`${anchor}T12:00:00Z`);
  const weekday = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - weekday + 1);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function datesForMonth(anchor: string) {
  const start = new Date(`${anchor.slice(0, 7)}-01T12:00:00Z`);
  const month = start.getUTCMonth();
  const dates: string[] = [];
  while (start.getUTCMonth() === month) {
    dates.push(start.toISOString().slice(0, 10));
    start.setUTCDate(start.getUTCDate() + 1);
  }
  return dates;
}
