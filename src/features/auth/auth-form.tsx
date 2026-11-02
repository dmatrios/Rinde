"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  login,
  signup,
  forgotPassword,
  resendConfirmation,
  updatePassword,
} from "@/features/auth/actions";
import { initialActionState } from "@/lib/auth/types";

export type AuthMode = "login" | "signup" | "forgot" | "confirm" | "update";
const content = {
  login: {
    title: "Qué bueno verte de vuelta.",
    subtitle: "Entra a tu espacio y pon tus cuentas en claro.",
    button: "Iniciar sesión",
    action: login,
  },
  signup: {
    title: "Que cada jornada cuente.",
    subtitle: "Crea tu cuenta y empieza a conocer lo que te rinde.",
    button: "Crear mi cuenta",
    action: signup,
  },
  forgot: {
    title: "Recupera tu acceso.",
    subtitle: "Te enviaremos un enlace para cambiar tu contraseña.",
    button: "Enviar enlace",
    action: forgotPassword,
  },
  confirm: {
    title: "Confirma tu correo.",
    subtitle: "Te enviaremos un enlace nuevo para activar tu cuenta.",
    button: "Reenviar confirmación",
    action: resendConfirmation,
  },
  update: {
    title: "Una nueva contraseña.",
    subtitle: "Elige una contraseña segura para volver a tu cuenta.",
    button: "Guardar contraseña",
    action: updatePassword,
  },
};
export function AuthForm({
  mode,
  configured,
  notice,
}: {
  mode: AuthMode;
  configured: boolean;
  notice?: string;
}) {
  const { title, subtitle, button, action } = content[mode];
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  const [visible, setVisible] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resendState, resendAction, resending] = useActionState(
    resendConfirmation,
    initialActionState,
  );
  const completed = state.status === "success";
  return (
    <div className="w-full max-w-[390px]">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.16em] text-primary">
        Tu espacio personal
      </p>
      <h1 className="text-[32px] font-bold leading-[1.15] tracking-[-1px]">
        {title}
      </h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{subtitle}</p>
      {!configured && (
        <div className="mt-6 rounded-xl border border-notice-border bg-notice p-4 text-xs leading-5 text-notice-foreground">
          El acceso no está disponible temporalmente. Inténtalo de nuevo en unos
          minutos.
        </div>
      )}
      {notice && (
        <p
          role="status"
          className="mt-5 rounded-xl bg-muted p-4 text-xs leading-5"
        >
          {notice}
        </p>
      )}
      <form
        action={formAction}
        className="mt-7 space-y-5"
        aria-busy={pending}
        onSubmit={(event) => {
          if (mode !== "signup") return;
          const email = new FormData(event.currentTarget).get("email");
          if (typeof email === "string") setConfirmationEmail(email);
        }}
      >
        <fieldset
          disabled={!configured || pending || completed}
          className="space-y-5 disabled:opacity-65"
        >
          {mode === "signup" && (
            <Field label="¿Cómo te llamas?" name="displayName">
              <Input
                id="displayName"
                name="displayName"
                autoComplete="given-name"
                placeholder="Tu nombre"
                minLength={2}
                maxLength={80}
                required
              />
            </Field>
          )}
          {mode !== "update" && (
            <Field label="Correo electrónico" name="email">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="tu@correo.com"
                maxLength={254}
                required
              />
            </Field>
          )}
          {mode !== "forgot" && mode !== "confirm" && (
            <Field label="Contraseña" name="password">
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={visible ? "text" : "password"}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder={
                    mode === "login"
                      ? "Tu contraseña"
                      : "Al menos 12 caracteres"
                  }
                  minLength={mode === "login" ? 1 : 12}
                  maxLength={128}
                  required
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  aria-label={
                    visible ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  aria-pressed={visible}
                  className="absolute right-0 top-0 flex size-12 items-center justify-center rounded-r-xl text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
          )}
          {mode === "update" && (
            <Field label="Confirmar contraseña" name="confirmPassword">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
              />
            </Field>
          )}
          {mode === "login" && (
            <div className="flex flex-col items-end gap-1">
              <label className="mr-auto flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                <input
                  name="rememberSession"
                  type="checkbox"
                  defaultChecked
                  className="size-4 rounded border-input accent-primary"
                />
                Mantener mi sesión iniciada
              </label>
              <Link
                href="/forgot-password"
                className="inline-flex min-h-11 items-center text-xs font-medium text-primary"
              >
                Olvidé mi contraseña
              </Link>
              <Link
                href="/confirm-email"
                className="inline-flex min-h-9 items-center text-xs font-medium text-primary"
              >
                No confirmaste tu correo
              </Link>
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={!configured || pending || completed}
          >
            {pending ? (
              <>
                <LoaderCircle className="animate-spin" />
                Procesando…
              </>
            ) : (
              <>
                {button}
                <ArrowRight />
              </>
            )}
          </Button>
        </fieldset>
        {state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={
              state.status === "error"
                ? "rounded-xl bg-destructive/10 p-4 text-xs leading-6 text-destructive"
                : "rounded-xl bg-success p-4 text-xs leading-6 text-success-foreground"
            }
          >
            {state.message}
          </p>
        )}
      </form>
      {mode === "signup" && completed && confirmationEmail && (
        <div className="mt-4 rounded-xl bg-muted p-4 text-xs leading-5 text-muted-foreground">
          <p>¿No encuentras el correo?</p>
          <form action={resendAction} className="mt-3" aria-busy={resending}>
            <input type="hidden" name="email" value={confirmationEmail} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="min-h-0 px-0 text-primary hover:bg-transparent"
              disabled={resending}
            >
              {resending ? "Enviando…" : "Reenviar confirmación"}
            </Button>
          </form>
          {resendState.message && (
            <p
              role={resendState.status === "error" ? "alert" : "status"}
              className={
                resendState.status === "error"
                  ? "mt-2 text-destructive"
                  : "mt-2 text-success-foreground"
              }
            >
              {resendState.message}
            </p>
          )}
        </div>
      )}
      <div className="mt-7 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        {mode === "login" ? (
          <>
            ¿Primera vez por aquí?{" "}
            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center font-semibold text-primary"
            >
              Crea tu cuenta
            </Link>
          </>
        ) : (
          <Link
            href={mode === "update" ? "/app" : "/login"}
            className="inline-flex min-h-11 items-center font-semibold text-primary"
          >
            {mode === "update"
              ? "Volver a mi resumen"
              : "Volver a iniciar sesión"}
          </Link>
        )}
      </div>
    </div>
  );
}
function Field({
  label,
  name,
  children,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-xs font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}
