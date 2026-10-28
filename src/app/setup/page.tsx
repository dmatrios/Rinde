import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getSupabaseConfig } from "@/lib/config";
export const metadata = { title: "Preparar conexión" };
export default function SetupPage() {
  if (getSupabaseConfig()) redirect("/login");

  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-10">
      <Brand />
      <div className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-9">
        <p className="mb-3 text-xs font-semibold text-primary">
          Configuración del proyecto
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Estamos preparando tu espacio.
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Todavía no está listo para crear una cuenta ni guardar información.
          Puedes explorar el diseño mientras se completa la preparación.
        </p>
        <p className="my-6 text-xs leading-6 text-muted-foreground">
          Si necesitas entrar, comunícate con la persona que administra la
          aplicación.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/preview">
              Explorar el diseño
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Ir al acceso</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
