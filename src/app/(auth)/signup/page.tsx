import { AuthForm } from "@/features/auth/auth-form";
import { getSupabaseConfig } from "@/lib/config";
export const metadata = { title: "Crear cuenta" };
export default function SignupPage() {
  return <AuthForm mode="signup" configured={Boolean(getSupabaseConfig())} />;
}
