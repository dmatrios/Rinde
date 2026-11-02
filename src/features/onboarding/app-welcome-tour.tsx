"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const storageKey = "rinde-product-tour-v1";

const steps = [
  {
    target: '[data-tour="journey"]',
    title: "Empieza por tu jornada",
    description: "Desde aquí inicias, pausas y finalizas tu tiempo de trabajo.",
  },
  {
    target: '[data-tour="quick-register"]',
    title: "Registra en un toque",
    description:
      "Usa este botón para anotar un ingreso, gasto o recarga sin salir de donde estás.",
  },
  {
    target: '[data-tour="settings"]',
    title: "Déjalo a tu manera",
    description:
      "En Ajustes puedes revisar tus plataformas, vehículo y datos de comprobantes.",
  },
] as const;

type Spotlight = { top: number; left: number; width: number; height: number };

export function AppWelcomeTour({ enabled }: { enabled: boolean }) {
  const [step, setStep] = useState<number | null>(null);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);

  const finishTour = useCallback(() => {
    window.localStorage.setItem(storageKey, "complete");
    setStep(null);
  }, []);

  useEffect(() => {
    if (!enabled || window.localStorage.getItem(storageKey)) return;
    const frame = window.requestAnimationFrame(() => setStep(0));
    return () => window.cancelAnimationFrame(frame);
  }, [enabled]);

  useEffect(() => {
    if (step === null) return;
    const currentStep = steps[step];
    if (!currentStep) {
      const frame = window.requestAnimationFrame(finishTour);
      return () => window.cancelAnimationFrame(frame);
    }
    const target = getVisibleTarget(currentStep.target);
    if (!target) {
      const frame = window.requestAnimationFrame(finishTour);
      return () => window.cancelAnimationFrame(frame);
    }

    const updateSpotlight = () => {
      const bounds = target.getBoundingClientRect();
      const padding = 8;
      setSpotlight({
        top: Math.max(8, bounds.top - padding),
        left: Math.max(8, bounds.left - padding),
        width: Math.min(window.innerWidth - 16, bounds.width + padding * 2),
        height: Math.min(window.innerHeight - 16, bounds.height + padding * 2),
      });
    };

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);
    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [finishTour, step]);

  if (step === null || !spotlight) return null;
  const current = steps[step];
  if (!current) return null;
  const isLast = step === steps.length - 1;
  const showAbove = spotlight.top > window.innerHeight / 2;
  const panelTop = showAbove
    ? Math.max(20, spotlight.top - 196)
    : Math.min(window.innerHeight - 196, spotlight.top + spotlight.height + 18);
  const panelLeft = Math.min(
    Math.max(16, spotlight.left),
    Math.max(16, window.innerWidth - 356),
  );

  return (
    <div className="fixed inset-0 z-[70]" aria-live="polite">
      <div
        aria-hidden
        className="pointer-events-none fixed rounded-2xl border-2 border-primary/90 transition-all duration-300"
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
          boxShadow: "0 0 0 9999px rgb(17 24 39 / 0.68)",
        }}
      />
      <section
        aria-label={`Guía de bienvenida: paso ${step + 1} de ${steps.length}`}
        className="fixed z-10 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-5 text-foreground shadow-[0_24px_70px_-26px_rgb(15_23_42_/_0.58)] animate-in fade-in zoom-in-95 duration-200"
        style={{ top: panelTop, left: panelLeft }}
      >
        <button
          type="button"
          aria-label="Cerrar guía"
          onClick={finishTour}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          <X size={17} />
        </button>
        <p className="text-xs font-semibold text-primary">
          Paso {step + 1} de {steps.length}
        </p>
        <h2 className="mt-2 pr-7 text-base font-semibold tracking-tight">
          {current.title}
        </h2>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          {current.description}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finishTour}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Saltar guía
          </button>
          <Button
            type="button"
            size="sm"
            onClick={() => (isLast ? finishTour() : setStep(step + 1))}
          >
            {isLast ? (
              <>
                Listo <Check />
              </>
            ) : (
              "Siguiente"
            )}
          </Button>
        </div>
      </section>
    </div>
  );
}

function getVisibleTarget(selector: string) {
  return [...document.querySelectorAll<HTMLElement>(selector)].find(
    (element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0;
    },
  );
}
