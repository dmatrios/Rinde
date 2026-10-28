import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";
import { getAccount } from "@/features/settings/queries";

export default async function WelcomePage() {
  const account = await getAccount();
  if (account.settings.onboarding_completed) redirect("/app");
  return (
    <main
      id="main-content"
      className="mx-auto min-h-dvh max-w-2xl px-5 py-8 sm:px-8 sm:py-12"
    >
      <Brand href="/welcome" />
      <OnboardingForm name={account.profile.display_name} />
    </main>
  );
}
