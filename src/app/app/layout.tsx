import { AppShell } from "@/components/layout/app-shell";
import { redirect } from "next/navigation";
import { getQuickRegisterData } from "@/features/dashboard/quick-register-queries";
import { getAccount } from "@/features/settings/queries";
export const dynamic = "force-dynamic";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [account, quickRegister] = await Promise.all([
    getAccount(),
    getQuickRegisterData(),
  ]);
  if (!account.settings.onboarding_completed) redirect("/welcome");
  const platformNames = new Map(
    account.platforms.map((platform) => [platform.id, platform.name]),
  );

  return (
    <AppShell
      name={account.profile.display_name}
      quickRegister={{
        categories: quickRegister.categories,
        defaultMode: account.settings.earnings_mode,
        platforms: account.platforms.filter((platform) => platform.active),
        ruc: account.settings.ruc,
        activeShiftId: quickRegister.activeShiftId,
        activeShiftPlatformId: quickRegister.activeShiftPlatformId,
        shifts: quickRegister.shifts.map((shift) => ({
          ...shift,
          platformName: platformNames.get(shift.platform_id) ?? "Plataforma",
        })),
      }}
    >
      {children}
    </AppShell>
  );
}
