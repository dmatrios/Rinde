import Link from "next/link";
import { ArrowLeft, Layers2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
const modules: Record<string, { title: string; description: string }> = {
  activity: {
    title: "Tus jornadas, en un solo lugar.",
    description: "Vuelve a tu resumen para continuar con tu día.",
  },
  earnings: {
    title: "Tu resumen, siempre a la mano.",
    description: "Vuelve a tu resumen para continuar con tu día.",
  },
  expenses: {
    title: "Tu resumen, siempre a la mano.",
    description: "Vuelve a tu resumen para continuar con tu día.",
  },
  reports: {
    title: "Tu resumen, siempre a la mano.",
    description: "Vuelve a tu resumen para continuar con tu día.",
  },
};
export function ComingNext({
  section,
  preview = false,
}: {
  section: string;
  preview?: boolean;
}) {
  const plannedModule = modules[section];
  if (!plannedModule) return null;
  return (
    <Card className="mx-auto my-10 max-w-xl p-7 sm:my-16 sm:p-10">
      <span className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
        <Layers2 size={24} />
      </span>
      <p className="mb-3 text-xs font-semibold text-primary">Rinde</p>
      <h1 className="text-3xl font-bold tracking-tight">
        {plannedModule.title}
      </h1>
      <p className="mb-7 mt-4 text-sm leading-7 text-muted-foreground">
        {plannedModule.description}
      </p>
      <Button asChild variant="outline">
        <Link href={preview ? "/preview" : "/app"}>
          <ArrowLeft />
          Volver a mi resumen
        </Link>
      </Button>
    </Card>
  );
}
