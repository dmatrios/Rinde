import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatMoney } from "@/lib/finance/money";
import type { Movement } from "./queries";

const methods = {
  cash: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
} as const;

export function MovementsPanel({ movements }: { movements: Movement[] }) {
  return (
    <section className="mt-6 max-w-4xl rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <h2 className="text-base font-semibold">Movimientos recientes</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Abre un movimiento para ver sus datos y la jornada relacionada.
      </p>
      {movements.length ? (
        <ul className="mt-5 divide-y divide-border">
          {movements.map((movement) => {
            const outgoing = movement.kind === "expense" || movement.kind === "fuel";
            return (
              <li key={`${movement.kind}-${movement.id}`}>
                <Link
                  href={`/app/activity/movement/${movement.kind}/${movement.id}`}
                  className="group flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold group-hover:text-primary">
                      {movement.title}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatDateTime(movement.date)}
                      {movement.method ? ` · ${methods[movement.method]}` : ""}
                      {` · ${movement.shiftId ? "En jornada" : "Sin jornada"}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`text-sm font-semibold tabular-nums ${outgoing ? "text-foreground" : "text-primary"}`}>
                      {outgoing ? "−" : "+"}{formatMoney(movement.cents)}
                    </span>
                    <ArrowUpRight size={16} className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">Todavía no hay movimientos.</p>
      )}
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima",
  }).format(new Date(value));
}
