import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/components/layout/auth-shell";
import { requireUser } from "@/lib/auth/session";
export const metadata = { title: "Nueva contraseña" };
export const dynamic = "force-dynamic";
export default async function UpdatePage() {
  await requireUser();
  return (
    <AuthShell>
      <AuthForm mode="update" configured />
    </AuthShell>
  );
}
