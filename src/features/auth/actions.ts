"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl, getSupabaseConfig } from "@/lib/config";
import { requireUser } from "@/lib/auth/session";
import {
  emailSchema,
  loginSchema,
  signupSchema,
  recoverySchema,
  updatePasswordSchema,
  displayNameSchema,
} from "@/lib/auth/validation";
import type { ActionState } from "@/lib/auth/types";

const errorState = (message: string): ActionState => ({
  status: "error",
  message,
});
const successState = (message: string): ActionState => ({
  status: "success",
  message,
});
const unavailable = "No pudimos conectar. Intenta de nuevo en un momento.";
const missing = "La conexión de tu cuenta aún no está configurada.";
function authError(code?: string) {
  if (code === "email_not_confirmed")
    return "Confirma tu correo antes de iniciar sesión.";
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  )
    return "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.";
  if (code === "weak_password")
    return "Elige una contraseña más segura de al menos 12 caracteres.";
  return "No pudimos completar la solicitud. Revisa tus datos e inténtalo de nuevo.";
}

export async function login(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!getSupabaseConfig()) return errorState(missing);
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return errorState(parsed.error.issues[0]?.message ?? "Revisa tus datos.");
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error)
      return errorState(
        error.code === "invalid_credentials"
          ? "Correo o contraseña incorrectos."
          : authError(error.code),
      );
  } catch {
    return errorState(unavailable);
  }
  redirect("/app");
}

export async function signup(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!getSupabaseConfig()) return errorState(missing);
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return errorState(parsed.error.issues[0]?.message ?? "Revisa tus datos.");
  let signedIn = false;
  try {
    const supabase = await createClient();
    const { email, password, displayName } = parsed.data;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${getAppUrl()}/auth/callback`,
      },
    });
    if (error) return errorState(authError(error.code));
    signedIn = Boolean(data.session);
  } catch {
    return errorState(unavailable);
  }
  if (signedIn) redirect("/app");
  return successState(
    "Revisa tu correo para confirmar tu cuenta. Si ya tienes una, puedes iniciar sesión o recuperar tu contraseña.",
  );
}

export async function forgotPassword(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!getSupabaseConfig()) return errorState(missing);
  const parsed = recoverySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return errorState("Ingresa un correo válido.");
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      { redirectTo: `${getAppUrl()}/auth/callback?next=/auth/update-password` },
    );
    if (error) return errorState(authError(error.code));
  } catch {
    return errorState(unavailable);
  }
  return successState(
    "Si existe una cuenta con ese correo, recibirás un enlace para cambiar tu contraseña.",
  );
}

export async function resendConfirmation(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!getSupabaseConfig()) return errorState(missing);
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return errorState("Ingresa un correo válido.");
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data,
      options: { emailRedirectTo: `${getAppUrl()}/auth/callback` },
    });
    if (error) return errorState(authError(error.code));
  } catch {
    return errorState(unavailable);
  }
  return successState(
    "Si tu cuenta necesita confirmación, enviamos un enlace nuevo a ese correo.",
  );
}

export async function updatePassword(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = updatePasswordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return errorState(
      parsed.error.issues[0]?.message ?? "Revisa la contraseña.",
    );
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) return errorState(authError(error.code));
    const { error: logoutError } = await supabase.auth.signOut({
      scope: "local",
    });
    if (logoutError)
      return successState("Contraseña actualizada. Puedes volver al inicio.");
  } catch {
    return errorState(unavailable);
  }
  redirect("/login?updated=1");
}

export async function logout() {
  if (!getSupabaseConfig()) redirect("/login");
  let failed = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    failed = Boolean(error);
  } catch {
    failed = true;
  }
  if (failed) redirect("/app?logoutError=1");
  redirect("/login");
}

export async function deleteOwnAccount(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const confirmation = form.get("confirmation");
  if (confirmation !== "ELIMINAR")
    return errorState("Escribe ELIMINAR para confirmar.");
  await requireUser();
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("delete_own_account");
    if (error) return errorState("No pudimos eliminar tu cuenta.");
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    return errorState(unavailable);
  }
  redirect("/login?deleted=1");
}

export async function updateProfile(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = displayNameSchema.safeParse(form.get("displayName"));
  if (!parsed.success)
    return errorState(parsed.error.issues[0]?.message ?? "Revisa tu nombre.");
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: parsed.data })
      .eq("id", user.id)
      .select("id")
      .single();
    if (error)
      return errorState(
        "No se pudo guardar el perfil. Revisa que la migración esté aplicada.",
      );
  } catch {
    return errorState(unavailable);
  }
  revalidatePath("/app", "layout");
  return successState("Tu nombre se guardó correctamente.");
}
