import { EmptyDashboard } from "@/features/dashboard/empty-dashboard";
import { getDashboardEarningsSummary } from "@/features/earnings/queries";
import { getAccount } from "@/features/settings/queries";
import { getShiftWorkspace } from "@/features/shifts/queries";
export const metadata = { title: "Mi resumen" };
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [account, workspace, earningsSummary] = await Promise.all([
    getAccount(),
    getShiftWorkspace(),
    getDashboardEarningsSummary(),
  ]);
  const params = await searchParams;
  return (
    <>
      {params.logoutError && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
        >
          No se pudo cerrar la sesión. Inténtalo de nuevo.
        </p>
      )}
      <EmptyDashboard
        name={account.profile.display_name}
        current={workspace.current}
        activePlatforms={workspace.activePlatforms}
        earningsSummary={earningsSummary}
      />
    </>
  );
}
