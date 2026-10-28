"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/numeric-input";
import { completeOnboarding } from "@/features/onboarding/actions";
import { VEHICLE_OPTIONS } from "@/features/settings/vehicle-options";
import { PLATFORM_PRESETS } from "@/features/shifts/platform-options";
import { initialActionState } from "@/lib/auth/types";

export function OnboardingForm({ name }: { name: string }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [vehicle, setVehicle] = useState("");
  const [odometer, setOdometer] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [state, action, pending] = useActionState(
    completeOnboarding,
    initialActionState,
  );
  const toggle = (value: string) =>
    setPlatforms((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  const needsOdometer = vehicle === "Moto" || vehicle === "Carro";
  const canContinue = Boolean(vehicle && (!needsOdometer || odometer));

  return (
    <section className="mt-12 rounded-[1.75rem] border border-border bg-card p-6 shadow-[0_24px_70px_-36px_rgb(32_42_58_/_0.45)] sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">
        Bienvenida
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Hola, {name}.</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        Somos Rinde: un espacio para llevar tus jornadas, ingresos y gastos con
        claridad. Cuéntanos lo esencial para preparar tu cuenta.
      </p>
      <form action={action} className="mt-8" aria-busy={pending}>
        <input type="hidden" name="vehicle" value={vehicle} />
        {step === 2 && <input type="hidden" name="odometer" value={odometer} />}
        <OnboardingProgress step={step} />
        {step === 1 ? (
          <div className="animate-in fade-in slide-in-from-right-2 duration-300">
            <div>
              <p className="mb-3 text-sm font-semibold">
                ¿Con qué haces tus entregas?
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {VEHICLE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setVehicle(option);
                      if (option === "Bicicleta") setOdometer("");
                    }}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${vehicle === option ? "border-primary bg-secondary text-secondary-foreground" : "border-border hover:bg-muted"}`}
                  >
                    {vehicle === option && (
                      <Check className="mb-2 text-primary" size={16} />
                    )}
                    {option}
                  </button>
                ))}
              </div>
            </div>
            {needsOdometer && (
              <div className="mt-6 animate-in fade-in slide-in-from-top-1 duration-200">
                <label
                  htmlFor="welcome-odometer"
                  className="mb-2 block text-sm font-semibold"
                >
                  Kilometraje actual
                </label>
                <NumericInput
                  id="welcome-odometer"
                  name="odometer"
                  value={odometer}
                  onValueChange={setOdometer}
                  decimals={1}
                  maxLength={15}
                  placeholder="0.0"
                  disabled={pending}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Así podremos acompañarte mejor en tus recorridos.
                </p>
              </div>
            )}
            <div className="mt-7 flex justify-end">
              <Button
                type="button"
                disabled={!canContinue || pending}
                onClick={() => setStep(2)}
              >
                Continuar <ArrowRight />
              </Button>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-2 duration-300">
            <div>
              <p className="mb-1 text-sm font-semibold">
                ¿Qué plataformas usarás?
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                Elige las que quieres tener listas al empezar.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PLATFORM_PRESETS.map((platform) => (
                  <label
                    key={platform}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${platforms.includes(platform) ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`}
                  >
                    <input
                      type="checkbox"
                      name="platform"
                      value={platform}
                      checked={platforms.includes(platform)}
                      onChange={() => toggle(platform)}
                      className="size-4 accent-primary"
                    />
                    {platform}
                  </label>
                ))}
              </div>
            </div>
            {state.message && (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
              >
                {state.message}
              </p>
            )}
            <div className="mt-7 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setStep(1)}
              >
                <ArrowLeft /> Volver
              </Button>
              <Button
                type="submit"
                className="relative"
                disabled={pending || !platforms.length}
              >
                <span className={pending ? "invisible" : ""}>
                  Preparar mi espacio
                </span>
                {pending && (
                  <LoaderCircle className="absolute animate-spin" aria-hidden />
                )}
                {pending && (
                  <span className="sr-only">Preparando tu espacio</span>
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}

function OnboardingProgress({ step }: { step: 1 | 2 }) {
  return (
    <div
      className="mb-8 flex items-center gap-3"
      aria-label={`Paso ${step} de 2`}
    >
      {[1, 2].map((number) => {
        const current = number === step;
        const complete = number < step;
        return (
          <div key={number} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${current || complete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {complete ? <Check size={14} aria-hidden /> : number}
            </span>
            <span
              className={`truncate text-xs font-semibold ${current ? "text-foreground" : "text-muted-foreground"}`}
            >
              {number === 1 ? "Vehículo" : "Plataformas"}
            </span>
            {number === 1 && (
              <span className="h-px min-w-3 flex-1 bg-border" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}
