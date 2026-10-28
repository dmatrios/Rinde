import { AuthForm } from "@/features/auth/auth-form";
import { getSupabaseConfig } from "@/lib/config";

export const metadata = { title: "Confirmar correo" };

export default function ConfirmEmailPage() {
  return <AuthForm mode="confirm" configured={Boolean(getSupabaseConfig())} />;
}
