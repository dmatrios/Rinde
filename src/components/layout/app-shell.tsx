import Link from "next/link";
import { ArrowUpRight, ChevronRight, LogOut, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { Navigation } from "@/components/layout/navigation";
import {
  QuickRegisterMenu,
  type QuickRegisterData,
} from "@/components/layout/quick-register-menu";
import { logout } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToastProvider } from "@/components/ui/toast";

export function AppShell({
  children,
  preview = false,
  name = "Mi cuenta",
  quickRegister,
}: {
  children: React.ReactNode;
  preview?: boolean;
  name?: string;
  quickRegister?: QuickRegisterData;
}) {
  const base = preview ? "/preview" : "/app";
  return (
    <ToastProvider>
      <div className="min-h-dvh">
        <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-card px-5 py-7 lg:flex xl:w-64">
          <div className="px-2">
            <Brand href={base} />
            <p className="mt-3 text-[11px] text-muted-foreground">
              Tu trabajo, en claro.
            </p>
          </div>
          <p className="mb-4 mt-12 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
            Mi espacio
          </p>
          <Navigation preview={preview} />
          <div className="mt-auto">
            <div className="mb-5 rounded-xl bg-background p-4">
              <ShieldCheck size={19} className="mb-2 text-primary" />
              <p className="text-xs font-semibold">Tus cuentas son tuyas.</p>
              <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                Cada cuenta tiene su propio espacio privado.
              </p>
            </div>
            <Link
              href={base + "/settings"}
              className="flex min-h-12 items-center gap-3 rounded-lg px-1"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {preview ? "R" : name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">
                  {preview ? "Vista previa" : name}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {preview ? "Sin datos personales" : "Cuenta personal"}
                </p>
              </div>
              <ChevronRight
                size={14}
                className="ml-auto shrink-0 text-muted-foreground"
              />
            </Link>
            {!preview && (
              <form action={logout}>
                <Button
                  variant="ghost"
                  className="mt-2 w-full justify-start px-2 text-xs"
                  type="submit"
                >
                  <LogOut />
                  Cerrar sesión
                </Button>
              </form>
            )}
          </div>
        </aside>
        <div className="lg:pl-60 xl:pl-64">
          <header className="border-b border-border bg-card">
            <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 xl:px-11">
              <div className="lg:hidden">
                <Brand href={base} />
              </div>
              <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
                Mi espacio
                <ChevronRight size={12} />
                <span className="text-foreground">Control de delivery</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  className={
                    preview
                      ? "border-primary/15 bg-secondary text-secondary-foreground"
                      : "bg-background"
                  }
                >
                  {preview ? "Vista previa" : "Cuenta personal"}
                </Badge>
                {preview ? (
                  <Link
                    href="/login"
                    className="flex min-h-11 items-center gap-1 text-xs font-semibold"
                  >
                    Ingresar
                    <ArrowUpRight size={15} />
                  </Link>
                ) : (
                  <form action={logout} className="lg:hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Cerrar sesión"
                    >
                      <LogOut />
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </header>
          {preview && (
            <div className="border-b border-notice-border bg-notice px-5 py-2.5 text-center text-[11px] leading-5 text-notice-foreground">
              Estás explorando el diseño.{" "}
              <Link
                href="/setup"
                className="font-semibold underline underline-offset-3"
              >
                Conecta tu cuenta
              </Link>{" "}
              para empezar a guardar tus registros.
            </div>
          )}
          <main
            id="main-content"
            className="app-main mx-auto max-w-[1440px] px-5 pt-7 sm:px-8 sm:pt-9 xl:px-11"
          >
            {children}
          </main>
          {!preview && quickRegister && <QuickRegisterMenu {...quickRegister} />}
        </div>
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-3 pt-2 lg:hidden">
          <Navigation preview={preview} mobile />
        </div>
      </div>
    </ToastProvider>
  );
}
