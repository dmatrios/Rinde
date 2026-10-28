import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyDashboard } from "@/features/dashboard/empty-dashboard";
import { SettingsView } from "@/features/settings/settings-view";
import { ComingNext } from "@/components/coming-next";
export const dynamic = "force-dynamic";
export const metadata = { title: "Vista previa" };
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  if (
    section &&
    (section.length !== 1 ||
      !["activity", "earnings", "expenses", "reports", "settings"].includes(
        section[0] ?? "",
      ))
  )
    notFound();
  const current = section?.[0];
  return (
    <AppShell preview>
      {!current ? (
        <EmptyDashboard preview />
      ) : current === "settings" ? (
        <SettingsView />
      ) : (
        <ComingNext section={current} preview />
      )}
    </AppShell>
  );
}
