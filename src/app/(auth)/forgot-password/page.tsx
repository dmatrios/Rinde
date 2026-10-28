import { AuthForm } from "@/features/auth/auth-form";
import { getSupabaseConfig } from "@/lib/config";
export const metadata = { title: "Recuperar contraseña" };
export default function ForgotPage() {
  return <AuthForm mode="forgot" configured={Boolean(getSupabaseConfig())} />;
}
