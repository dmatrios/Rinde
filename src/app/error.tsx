"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6"
    >
      <h1 className="text-2xl font-bold">Algo no se pudo cargar.</h1>
      <p className="my-5 text-sm leading-6 text-muted-foreground">
        Revisa tu conexión e inténtalo nuevamente.
      </p>
      <Button onClick={reset}>Volver a intentar</Button>
    </main>
  );
}
