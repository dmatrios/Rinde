"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md py-12">
      <h1 className="text-2xl font-bold">No pudimos cargar tu cuenta.</h1>
      <p className="my-5 text-sm leading-6 text-muted-foreground">
        Revisa tu conexión e inténtalo nuevamente.
      </p>
      <Button onClick={reset}>Volver a intentar</Button>
    </div>
  );
}
