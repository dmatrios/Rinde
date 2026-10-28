import { AuthForm } from "@/features/auth/auth-form";
import { getSupabaseConfig } from "@/lib/config";
export const metadata = { title: "Iniciar sesión" };
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const notice = params.deleted
    ? "Tu cuenta y tus registros fueron eliminados."
    : params.updated
    ? "Contraseña actualizada. Inicia sesión con tu nueva contraseña."
    : params.authError
      ? "El enlace expiró o no es válido. Solicita uno nuevo e inténtalo otra vez."
      : params.sessionError
        ? "No se pudo cerrar la sesión. Vuelve a tu cuenta e inténtalo de nuevo."
        : undefined;
  return (
    <AuthForm
      mode="login"
      configured={Boolean(getSupabaseConfig())}
      notice={notice}
    />
  );
}
