import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-5 p-6"
    >
      <p className="text-sm text-primary">404</p>
      <h1 className="text-3xl font-bold">No encontramos esta página.</h1>
      <p className="text-muted-foreground">Vuelve al inicio para continuar.</p>
      <Button asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </main>
  );
}
