"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Coffee,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  Square,
  TimerReset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ModalPopover } from "@/components/ui/modal-popover";
import { NumericInput } from "@/components/ui/numeric-input";
import { useToast } from "@/components/ui/toast";
import { initialActionState } from "@/lib/auth/types";
import { startShift, transitionShift } from "@/features/shifts/actions";
import { formatShiftNotification } from "@/features/shifts/presentation";
import type { CompletedShift, ShiftDetails } from "@/features/shifts/queries";
import type { UserPlatform } from "@/types/database";

export function ShiftWorkspace({
  activePlatforms,
  current,
  history,
  openStartOnLoad = false,
}: {
  activePlatforms: UserPlatform[];
  current: ShiftDetails | null;
  history: CompletedShift[];
  openStartOnLoad?: boolean;
}) {
  return (
    <div className="grid max-w-4xl gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-5">
        <CurrentShift
          activePlatforms={activePlatforms}
          current={current}
          openStartOnLoad={openStartOnLoad}
        />
        <ShiftHistory history={history} />
      </div>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TimerReset size={18} />
            Tu tiempo efectivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Registramos el inicio y tus pausas por separado para que veas tu
            tiempo efectivo con precisión.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CurrentShift({
  activePlatforms,
  current,
  openStartOnLoad,
}: {
  activePlatforms: UserPlatform[];
  current: ShiftDetails | null;
  openStartOnLoad: boolean;
}) {
  const [startOpen, setStartOpen] = useState(openStartOnLoad);
  const [odometerAction, setOdometerAction] =
    useState<OdometerTransitionAction | null>(null);
  const [state, action, pending] = useActionState(
    transitionShift,
    initialActionState,
  );
  const { toast } = useToast();
  const lastState = useRef(initialActionState);

  useEffect(() => {
    if (!state.message || state === lastState.current) return;
    lastState.current = state;
    toast(
      formatShiftNotification(state.message),
      state.status === "error" ? "error" : "success",
    );
  }, [state, toast]);

  if (!current) {
    return (
      <Card className="overflow-hidden bg-panel text-panel-foreground">
        <CardHeader>
          <CardTitle className="text-panel-foreground">Tu jornada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-white/70">No tienes una jornada activa.</p>
          <Button
            type="button"
            className="mt-6"
            onClick={() => setStartOpen(true)}
          >
            <Plus />
            Iniciar jornada
          </Button>
          <StartShiftModal
            activePlatforms={activePlatforms}
            open={startOpen}
            onOpenChange={setStartOpen}
          />
        </CardContent>
      </Card>
    );
  }

  const paused = current.status === "paused";
  const lastPause = current.pauses.at(-1);
  const transitionAction = paused ? "resume" : "pause";
  const hasSavedPauseReading =
    paused &&
    lastPause?.odometer_pause !== null &&
    lastPause?.odometer_pause !== undefined;
  const needsFinishOdometer =
    current.odometer_start !== null && !hasSavedPauseReading;
  return (
    <Card className="overflow-hidden bg-panel text-panel-foreground">
      <CardHeader className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-white/60">Jornada actual</p>
          <CardTitle className="mt-1 text-panel-foreground">
            {current.platform.name}
          </CardTitle>
        </div>
        <span
          className={
            paused
              ? "rounded-full bg-white/10 px-3 py-1 text-xs text-white/80"
              : "rounded-full bg-panel-accent px-3 py-1 text-xs font-semibold text-panel"
          }
        >
          {paused ? "En pausa" : "En curso"}
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-white/70">
          Iniciada {formatDateTime(current.started_at)}.
        </p>
        {paused && lastPause && (
          <p className="mt-2 flex items-center gap-2 text-xs text-white/60">
            <Coffee size={15} /> En pausa desde{" "}
            {formatTime(lastPause.started_at)}.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {current.odometer_start === null ? (
            <form action={action} aria-busy={pending}>
              <input type="hidden" name="shiftId" value={current.id} />
              <input type="hidden" name="action" value={transitionAction} />
              <input type="hidden" name="odometerEnd" value="" />
              <TransitionButton paused={paused} pending={pending} />
            </form>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOdometerAction(transitionAction)}
              disabled={pending}
            >
              {paused ? <Play /> : <Pause />}
              {paused ? "Reanudar" : "Pausar"}
            </Button>
          )}
          {needsFinishOdometer ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOdometerAction("finish")}
              disabled={pending}
            >
              <Square />
              Finalizar
            </Button>
          ) : (
            <form action={action} aria-busy={pending}>
              <input type="hidden" name="shiftId" value={current.id} />
              <input type="hidden" name="action" value="finish" />
              <input type="hidden" name="odometerEnd" value="" />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={pending}
              >
                <Square />
                Finalizar
              </Button>
            </form>
          )}
        </div>
        {odometerAction && (
          <OdometerTransitionModal
            actionName={odometerAction}
            open
            onOpenChange={(open) => !open && setOdometerAction(null)}
            shiftId={current.id}
            odometerStart={current.odometer_start}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function StartShiftModal({
  activePlatforms,
  open,
  onOpenChange,
}: {
  activePlatforms: UserPlatform[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [platformId, setPlatformId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [trackOdometer, setTrackOdometer] = useState(false);
  const [odometerStart, setOdometerStart] = useState("");
  const pickerTriggerRef = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState(
    startShift,
    initialActionState,
  );
  const { toast } = useToast();
  const lastState = useRef(initialActionState);
  useEffect(() => {
    if (!state.message || state === lastState.current) return;
    lastState.current = state;
    toast(state.message, state.status === "error" ? "error" : "success");
  }, [state, toast]);
  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setPickerOpen(false);
          setPlatformId("");
          setTrackOdometer(false);
          setOdometerStart("");
        }
        onOpenChange(nextOpen);
      }}
      title="Iniciar jornada"
      description="La hora de inicio se guardará automáticamente."
    >
      {activePlatforms.length ? (
        <form action={action} className="space-y-5" aria-busy={pending}>
          <input type="hidden" name="platformId" value={platformId} />
          <label
            id="shift-platform-label"
            className="block text-xs font-semibold"
          >
            Plataforma
          </label>
          <div>
            <button
              ref={pickerTriggerRef}
              type="button"
              aria-labelledby="shift-platform-label"
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              onClick={() => setPickerOpen((current) => !current)}
              disabled={pending}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-card px-3.5 text-left text-sm transition-all duration-200 hover:border-muted-foreground/45 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span
                className={
                  platformId ? "text-foreground" : "text-muted-foreground"
                }
              >
                {activePlatforms.find((platform) => platform.id === platformId)
                  ?.name ?? "Elige una plataforma"}
              </span>
              <ChevronDown
                className={`text-muted-foreground transition-transform duration-200 ${
                  pickerOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {pickerOpen && (
              <ModalPopover
                anchorRef={pickerTriggerRef}
                open={pickerOpen}
                onOpenChange={setPickerOpen}
              >
                <div role="listbox" aria-labelledby="shift-platform-label">
                  {activePlatforms.map((platform) => {
                    const isSelected = platform.id === platformId;
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setPlatformId(platform.id);
                          setPickerOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                          isSelected
                            ? "bg-secondary text-secondary-foreground"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        {platform.name}
                        {isSelected && <Check size={16} aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              </ModalPopover>
            )}
          </div>
          <div className="rounded-xl border border-border bg-background/55 px-3.5 py-3">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={trackOdometer}
                onChange={(event) => setTrackOdometer(event.target.checked)}
                disabled={pending}
                className="size-4 rounded border-input accent-primary"
              />
              Registrar kilometraje de inicio
            </label>
            {trackOdometer ? (
              <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-150">
                <label
                  htmlFor="shift-odometer-start"
                  className="mb-2 block text-xs font-semibold"
                >
                  Kilometraje al iniciar
                </label>
                <NumericInput
                  id="shift-odometer-start"
                  name="odometerStart"
                  value={odometerStart}
                  onValueChange={setOdometerStart}
                  decimals={1}
                  maxLength={15}
                  placeholder="0.0"
                  disabled={pending}
                />
              </div>
            ) : (
              <input type="hidden" name="odometerStart" value="" />
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="relative"
              disabled={
                pending || !platformId || (trackOdometer && !odometerStart)
              }
            >
              <span className={pending ? "invisible" : ""}>Iniciar</span>
              {pending && (
                <LoaderCircle className="absolute animate-spin" aria-hidden />
              )}
              {pending && <span className="sr-only">Iniciando</span>}
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <p className="text-sm leading-6 text-muted-foreground">
            Antes de iniciar, agrega y activa una plataforma desde
            Configuración.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-5"
            onClick={() => onOpenChange(false)}
          >
            Entendido
          </Button>
        </div>
      )}
    </Modal>
  );
}

function TransitionButton({
  paused,
  pending,
}: {
  paused: boolean;
  pending: boolean;
}) {
  return (
    <Button
      type="submit"
      variant="secondary"
      size="sm"
      className="relative"
      disabled={pending}
    >
      <span className={`flex items-center gap-2 ${pending ? "invisible" : ""}`}>
        {paused ? <Play /> : <Pause />}
        {paused ? "Reanudar" : "Pausar"}
      </span>
      {pending && (
        <LoaderCircle className="absolute animate-spin" aria-hidden />
      )}
      {pending && <span className="sr-only">Actualizando</span>}
    </Button>
  );
}

export type OdometerTransitionAction = "pause" | "resume" | "finish";

export function OdometerTransitionModal({
  actionName,
  open,
  onOpenChange,
  shiftId,
  odometerStart,
}: {
  actionName: OdometerTransitionAction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId: string;
  odometerStart: number | null;
}) {
  const [state, action, pending] = useActionState(
    transitionShift,
    initialActionState,
  );
  const [odometerEnd, setOdometerEnd] = useState("");
  const { toast } = useToast();
  const lastState = useRef(initialActionState);
  useEffect(() => {
    if (!state.message || state === lastState.current) return;
    lastState.current = state;
    toast(state.message, state.status === "error" ? "error" : "success");
    if (state.status === "success") onOpenChange(false);
  }, [onOpenChange, state, toast]);
  const copy = transitionCopy(actionName);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      description={copy.description}
    >
      <form action={action} className="space-y-5" aria-busy={pending}>
        <input type="hidden" name="shiftId" value={shiftId} />
        <input type="hidden" name="action" value={actionName} />
        {odometerStart === null ? (
          <input type="hidden" name="odometerEnd" value="" />
        ) : (
          <div>
            <label
              htmlFor={`shift-odometer-${actionName}`}
              className="mb-2 block text-xs font-semibold"
            >
              {copy.label}
            </label>
            <NumericInput
              id={`shift-odometer-${actionName}`}
              name="odometerEnd"
              value={odometerEnd}
              onValueChange={setOdometerEnd}
              decimals={1}
              maxLength={15}
              placeholder="0.0"
              disabled={pending}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Iniciaste con {formatKilometers(odometerStart)} km.
            </p>
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Volver
          </Button>
          <Button
            type="submit"
            size="sm"
            className="relative"
            disabled={pending || (odometerStart !== null && !odometerEnd)}
          >
            <span className={pending ? "invisible" : ""}>{copy.submit}</span>
            {pending && (
              <LoaderCircle className="absolute animate-spin" aria-hidden />
            )}
            {pending && <span className="sr-only">Guardando</span>}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function transitionCopy(action: OdometerTransitionAction) {
  if (action === "pause") {
    return {
      description:
        "Guarda la lectura actual antes de detener el tiempo efectivo.",
      label: "Kilometraje al pausar",
      submit: "Pausar jornada",
      title: "Pausar jornada",
    };
  }
  if (action === "resume") {
    return {
      description: "Confirma la lectura actual antes de continuar tu jornada.",
      label: "Kilometraje al reanudar",
      submit: "Reanudar jornada",
      title: "Reanudar jornada",
    };
  }
  return {
    description: "Se cerrará con la hora actual. Podrás verla en tu historial.",
    label: "Kilometraje al finalizar",
    submit: "Finalizar jornada",
    title: "Finalizar jornada",
  };
}

function ShiftHistory({ history }: { history: CompletedShift[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial reciente</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length ? (
          <ul className="divide-y divide-border">
            {history.map((shift) => (
              <li
                key={shift.id}
                className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{shift.platformName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(shift.started_at)} ·{" "}
                    {formatTime(shift.ended_at)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  Finalizada
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aún no terminaste una jornada.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const formatter = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Lima",
});
const timeFormatter = new Intl.DateTimeFormat("es-PE", {
  timeStyle: "short",
  timeZone: "America/Lima",
});
function formatDateTime(value: string) {
  return formatter.format(new Date(value));
}
function formatKilometers(value: number) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatTime(value: string | null) {
  return value ? timeFormatter.format(new Date(value)) : "—";
}
