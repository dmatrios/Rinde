import Link from "next/link";
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
        Cobros, ingresos y gastos, dentro o fuera de tus jornadas.
      </p>
      {movements.length ? (
        <ul className="mt-5 divide-y divide-border">
          {movements.map((movement) => (
            <li
              key={`${movement.kind}-${movement.id}`}
              className="py-3 first:pt-0 last:pb-0"
            >
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {movement.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("es-PE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "America/Lima",
                      }).format(new Date(movement.date))}{" "}
                      · {movement.shiftId ? "En jornada" : "Fuera de jornada"}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${movement.kind === "expense" || movement.kind === "fuel" ? "text-foreground" : "text-primary"}`}
                  >
                    {movement.kind === "expense" || movement.kind === "fuel"
                      ? "−"
                      : "+"}
                    {formatMoney(movement.cents)}
                  </span>
                </summary>
                <div className="mt-2 rounded-xl bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
                  <p>
                    {movement.kind === "receipt"
                      ? "Cobro"
                      : movement.kind === "earning"
                        ? "Ingreso total"
                        : movement.kind === "fuel"
                          ? "Combustible"
                          : "Gasto"}
                    {movement.method ? ` · ${methods[movement.method]}` : ""}
                  </p>
                  {movement.detail && <p className="mt-1">{movement.detail}</p>}
                  {movement.cashReceivedCents !== null && (
                    <p className="mt-1">
                      {movement.kind === "receipt" ? "Recibido" : "Entregado"}:{" "}
                      {formatMoney(movement.cashReceivedCents)} · Vuelto:{" "}
                      {formatMoney(movement.cashReceivedCents - movement.cents)}
                    </p>
                  )}
                  {movement.coveredByTotal && (
                    <p className="mt-1">
                      Incluido en el ingreso total registrado.
                    </p>
                  )}
                  {(movement.kind === "expense" ||
                    movement.kind === "fuel") && (
                    <Link
                      href={`/app/expenses?${movement.kind === "expense" ? "edit" : "editFuel"}=${movement.id}`}
                      className="mt-2 inline-block font-semibold text-primary hover:underline"
                    >
                      Editar registro
                    </Link>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          Todavía no hay movimientos.
        </p>
      )}
    </section>
  );
}
