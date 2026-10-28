import { Clock3, Fuel, Wallet, ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand";
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden flex-col bg-panel p-12 text-panel-foreground lg:flex xl:p-16">
        <div className="[&_a]:text-white">
          <Brand href="/" />
        </div>
        <div className="my-auto max-w-lg py-16">
          <span className="mb-8 inline-flex rounded-full border border-white/20 px-3 py-1.5 text-[10px] tracking-wide text-white/80">
            HECHO PARA TU DÍA A DÍA
          </span>
          <h2 className="text-5xl font-semibold leading-[1.12] tracking-[-2px] xl:text-[60px]">
            Trabajas duro.
            <br />
            Conoce lo que
            <br />
            <span className="text-panel-accent">te queda.</span>
          </h2>
          <p className="mt-7 max-w-sm text-sm leading-7 text-white/65">
            Tus jornadas, ingresos y gastos de delivery. Un solo lugar para
            llevar las cuentas a tu ritmo.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 text-xs text-white/75">
            {[
              [Clock3, "Tu tiempo"],
              [Wallet, "Tus ingresos"],
              [Fuel, "Tus gastos"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Clock3;
              return (
                <span
                  key={label as string}
                  className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-3"
                >
                  <I size={16} />
                  {label as string}
                </span>
              );
            })}
          </div>
        </div>
        <p className="flex items-center gap-2 text-[11px] text-white/55">
          <ArrowUpRight size={15} />
          Cada jornada merece cuentas claras.
        </p>
      </aside>
      <div className="flex flex-col bg-card px-6 py-7 sm:px-12">
        <div className="mb-12 lg:hidden">
          <Brand />
        </div>
        <main
          id="main-content"
          className="flex flex-1 items-center justify-center py-6 lg:py-14"
        >
          {children}
        </main>
        <footer className="mt-8 text-center text-[10px] text-muted-foreground">
          Rinde · Tu trabajo, en claro.
        </footer>
      </div>
    </div>
  );
}
