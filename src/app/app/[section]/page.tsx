import { notFound } from "next/navigation";
import { ComingNext } from "@/components/coming-next";
import { ReportsView } from "@/features/reports/reports-view";
import { getReportsData } from "@/features/reports/queries";
import type { ReportRange } from "@/features/reports/periods";
import { SettingsView } from "@/features/settings/settings-view";
import { getAccount } from "@/features/settings/queries";
export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
  if (section === "reports") {
    const query = await searchParams;
    const requestedRange = first(query.range);
    const range = isReportRange(requestedRange) ? requestedRange : "week";
    return (
      <ReportsView
        {...await getReportsData(first(query.date))}
        initialRange={range}
      />
    );
  }
  const account = await getAccount();
  if (section === "settings") return <SettingsView account={account} />;
  if (!["earnings", "expenses", "reports"].includes(section)) notFound();
  return <ComingNext section={section} />;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isReportRange(value: string | undefined): value is ReportRange {
  return value === "day" || value === "week" || value === "month";
}
