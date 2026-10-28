import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ReceiptText,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function WeekSummary() {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle>Tu semana, de un vistazo</CardTitle>
        <Badge className="text-muted-foreground">Lun — Dom</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-40 flex-col items-center justify-center text-center">
          <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-background">
            <CalendarDays className="text-muted-foreground" size={20} />
          </div>
          <p className="text-sm font-medium">Aquí verás cómo va tu semana.</p>
          <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
            Cuando empieces a registrar, podrás comparar tus días y encontrar
            los que más te rinden.
          </p>
        </div>
        <div
          className="grid grid-cols-7 border-t border-border pt-4"
          aria-label="Semana sin registros"
        >
          {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => (
            <div className="text-center" key={i}>
              <span className="mb-2 block text-xs text-muted-foreground">
                —
              </span>
              <span className="text-[10px] text-muted-foreground">{day}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MovementsSummary({ base }: { base: string }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Movimientos de hoy</CardTitle>
        <ReceiptText size={17} className="text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-start gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm">Todavía no hay movimientos.</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Tus ganancias y gastos aparecerán aquí.
            </p>
          </div>
          <Button variant="outline" asChild size="sm">
            <Link href={base + "/earnings"}>
              Ver ingresos
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function GoalSummary({ base }: { base: string }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Tu meta diaria</CardTitle>
        <Target size={18} className="text-primary" />
      </CardHeader>
      <CardContent>
        <p className="text-xs leading-5 text-muted-foreground">
          Define cuánto quieres generar y sigue tu avance durante el día.
        </p>
        <div className="mb-3 mt-5 h-1.5 rounded-full bg-muted" />
        <p className="text-[11px] text-muted-foreground">
          Sin meta configurada
        </p>
        <Link
          href={base + "/settings"}
          className="mt-5 flex min-h-11 items-center gap-2 text-xs font-semibold text-primary"
        >
          Ver configuración
          <ArrowUpRight size={15} />
        </Link>
      </CardContent>
    </Card>
  );
}

export function ExtraStats() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>También cuenta</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between border-b border-border pb-4">
          <span className="text-xs text-muted-foreground">
            Pedidos realizados
          </span>
          <span className="tabular text-sm font-semibold">—</span>
        </div>
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs text-muted-foreground">
            Kilómetros recorridos
          </span>
          <span className="tabular text-sm font-semibold">—</span>
        </div>
      </CardContent>
    </Card>
  );
}
