"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Device = "android" | "ios" | "other";

const noSubscribe = () => () => {};

function detectDevice(): Device {
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  return ios ? "ios" : /Android/i.test(navigator.userAgent) ? "android" : "other";
}

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function subscribeToInstallation(listener: () => void) {
  const displayMode = window.matchMedia("(display-mode: standalone)");
  displayMode.addEventListener("change", listener);
  window.addEventListener("appinstalled", listener);
  return () => {
    displayMode.removeEventListener("change", listener);
    window.removeEventListener("appinstalled", listener);
  };
}

export function InstallRinde() {
  const device = useSyncExternalStore(noSubscribe, detectDevice, () => "other");
  const installed = useSyncExternalStore(subscribeToInstallation, isInstalled, () => false);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const savePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", savePrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", savePrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch {
      // El menú del navegador sigue disponible si cancela o bloquea el aviso.
    } finally {
      setPromptEvent(null);
    }
  };

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone size={18} /> Rinde en tu teléfono
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Ten Rinde a un toque en tu pantalla de inicio.
        </p>
        {promptEvent ? (
          <Button type="button" size="sm" onClick={install}>
            <Download size={16} /> Instalar Rinde
          </Button>
        ) : (
          <p className="text-xs leading-5 text-muted-foreground">
            {device === "ios"
              ? "En Safari, toca Compartir y luego Añadir a pantalla de inicio."
              : device === "android"
                ? "En Chrome, abre el menú ⋮ y elige Instalar aplicación."
                : "Abre el menú de tu navegador y elige Instalar aplicación o Añadir a pantalla de inicio."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
