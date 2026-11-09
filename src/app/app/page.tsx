import { EmptyDashboard } from "@/features/dashboard/empty-dashboard";
import { getDashboardEarningsSummary } from "@/features/earnings/queries";
import { getAccount } from "@/features/settings/queries";
import { getShiftWorkspace } from "@/features/shifts/queries";
import { getQuickRegisterData } from "@/features/dashboard/quick-register-queries";
export const metadata = { title: "Mi resumen" };
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [account, workspace, earningsSummary, quickRegister] =
    await Promise.all([
      getAccount(),
      getShiftWorkspace(),
      getDashboardEarningsSummary(),
      getQuickRegisterData(),
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
        uncountedShiftId={
          workspace.history[0]?.cash_counted == null
            ? workspace.history[0]?.id
            : undefined
        }
        activePlatforms={workspace.activePlatforms}
        quickRegister={{
          userId: quickRegister.userId,
          activeShiftId: quickRegister.activeShiftId,
          activeShiftPlatformId: quickRegister.activeShiftPlatformId,
          categories: quickRegister.categories,
          defaultMode: account.settings.earnings_mode,
          platforms: account.platforms.filter((platform) => platform.active),
          ruc: account.settings.ruc,
          shifts: quickRegister.shifts.map((shift) => ({
            ...shift,
            platformName:
              account.platforms.find(
                (platform) => platform.id === shift.platform_id,
              )?.name ?? "Plataforma",
          })),
        }}
        earningsSummary={earningsSummary}
      />
    </>
  );
}
