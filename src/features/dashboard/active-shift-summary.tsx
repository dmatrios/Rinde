"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Pause, Play, Route, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { initialActionState } from "@/lib/auth/types";
import { transitionShift } from "@/features/shifts/actions";
import { formatShiftNotification } from "@/features/shifts/presentation";
import {
  OdometerTransitionModal,
  StartShiftModal,
  type OdometerTransitionAction,
} from "@/features/shifts/shift-workspace";
import type { UserPlatform } from "@/types/database";
import { decimalToCents, formatMoney } from "@/lib/finance/money";
import { formatLimaTime } from "@/lib/format/lima-time";
import { SlideToStart } from "@/features/dashboard/slide-to-start";

export type DashboardShift = {
  cashBalance: number;
  id: string;
  platform: { name: string };
  pauses: Array<{
    ended_at: string | null;
    odometer_pause: number | null;
    odometer_resume: number | null;
    started_at: string;
  }>;
  odometer_start: number | null;
  started_at: string;
  status: "active" | "paused" | "completed";
};

export function ActiveShiftSummary({
  base,
  current,
  uncountedShiftId,
  activePlatforms,
  referenceTime,
}: {
  base: string;
  current: DashboardShift | null;
  uncountedShiftId?: string;
  activePlatforms: UserPlatform[];
  referenceTime: string;
}) {
  if (!current)
    return (
      <NoActiveShift
        base={base}
        activePlatforms={activePlatforms}
        uncountedShiftId={uncountedShiftId}
      />
    );

  return <CurrentShift current={current} referenceTime={referenceTime} />;
}

function NoActiveShift({
  base,
  activePlatforms,
  uncountedShiftId,
}: {
  base: string;
  activePlatforms: UserPlatform[];
  uncountedShiftId?: string;
}) {
  const [startOpen, setStartOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Tu jornada</CardTitle>
        <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-primary">
          <Route size={17} />
        </span>
      </CardHeader>
      <CardContent>
        <div className="mb-5 mt-2 flex items-center gap-2">
          <span className="size-2 rounded-full bg-status-inactive" />
          <p className="text-xs text-muted-foreground">Sin jornada activa</p>
        </div>
        <p className="text-lg font-semibold tracking-tight">
          Listo para salir.
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Inicia tu jornada y sigue tu tiempo efectivo desde aquí.
        </p>
        {base === "/preview" ? (
          <Button asChild className="mt-5 w-full">
            <Link href={base + "/activity"}>Iniciar jornada</Link>
          </Button>
        ) : (
          <SlideToStart onComplete={() => setStartOpen(true)} />
        )}
        {uncountedShiftId && base !== "/preview" && (
          <Link
            href={`/app/activity/${uncountedShiftId}?cash=1`}
            className="mt-4 inline-block text-xs font-semibold text-primary underline underline-offset-4"
          >
            Contar el efectivo de tu última jornada
          </Link>
        )}
        <StartShiftModal
          activePlatforms={activePlatforms}
          open={startOpen}
          onOpenChange={setStartOpen}
        />
      </CardContent>
    </Card>
  );
}

function CurrentShift({
  current,
  referenceTime,
}: {
  current: DashboardShift;
  referenceTime: string;
}) {
  const [state, action, pending] = useActionState(
    transitionShift,
    initialActionState,
  );
  const { toast } = useToast();
  const lastState = useRef(initialActionState);
  const [now, setNow] = useState(() => Date.parse(referenceTime));
  const [pendingAction, setPendingAction] = useState<
    "pause" | "resume" | "finish" | null
  >(null);
  const [odometerAction, setOdometerAction] =
    useState<OdometerTransitionAction | null>(null);
  const paused = current.status === "paused";
  const pauseAction = paused ? "resume" : "pause";
  const openPause = current.pauses.find((pause) => pause.ended_at === null);
  const hasSavedPauseReading = paused && openPause?.odometer_pause != null;
  const needsFinishOdometer =
    current.odometer_start !== null && !hasSavedPauseReading;
  const pausePending = pending && pendingAction === pauseAction;
  const finishPending = pending && pendingAction === "finish";
  const elapsed = getEffectiveDuration(current, now);

  useEffect(() => {
    const updateTime = () => setNow(Date.now());
    updateTime();
    const interval = window.setInterval(updateTime, 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!state.message || state === lastState.current) return;
    lastState.current = state;
    toast(
      formatShiftNotification(state.message),
      state.status === "error" ? "error" : "success",
    );
  }, [state, toast]);

  return (
    <Card className="overflow-hidden border-primary/20 shadow-[0_16px_34px_-26px_rgb(32_42_58_/_0.45)]">
      <CardHeader className="flex items-center justify-between gap-3">
        <div>
          <CardTitle>Tu jornada</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {current.platform.name}
          </p>
        </div>
        <span
          className={
            paused
              ? "rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
              : "rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground"
          }
        >
          {paused ? "En pausa" : "En curso"}
        </span>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl bg-panel px-4 py-3 text-panel-foreground">
          <p className="text-[11px] text-white/70">Tiempo efectivo</p>
          <p className="mt-1 tabular text-2xl font-semibold tracking-tight">
            {formatDuration(elapsed)}
          </p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Empezaste a las {formatLimaTime(current.started_at)}.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Efectivo en caja:{" "}
          <strong className="text-foreground">
            {formatMoney(decimalToCents(current.cashBalance))}
          </strong>
        </p>
        <div className="mt-5 flex gap-2">
          {current.odometer_start === null ? (
            <form
              action={action}
              className="min-w-0 flex-1"
              aria-busy={pausePending}
              onSubmit={() => setPendingAction(pauseAction)}
            >
              <input type="hidden" name="shiftId" value={current.id} />
              <input type="hidden" name="action" value={pauseAction} />
              <input type="hidden" name="odometerEnd" value="" />
              <TransitionButton paused={paused} pending={pausePending} />
            </form>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-w-0 flex-1"
              onClick={() => setOdometerAction(pauseAction)}
              disabled={pending}
            >
              {paused ? <Play /> : <Pause />}
              {paused ? "Reanudar" : "Pausar"}
            </Button>
          )}
          {!needsFinishOdometer ? (
            <form
              action={action}
              aria-busy={finishPending}
              onSubmit={() => setPendingAction("finish")}
            >
              <input type="hidden" name="shiftId" value={current.id} />
              <input type="hidden" name="action" value="finish" />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="relative"
                aria-label="Finalizar jornada"
                disabled={pending}
              >
                <span
                  className={`flex items-center gap-2 ${
                    finishPending ? "invisible" : ""
                  }`}
                >
                  <Square />
                  Finalizar
                </span>
                {finishPending && (
                  <LoaderCircle className="absolute animate-spin" aria-hidden />
                )}
                {finishPending && <span className="sr-only">Finalizando</span>}
              </Button>
            </form>
          ) : (
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
      className="relative w-full"
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

function getEffectiveDuration(current: DashboardShift, now: number) {
  const startedAt = Date.parse(current.started_at);
  const pauseDuration = current.pauses.reduce((total, pause) => {
    const pauseStartedAt = Date.parse(pause.started_at);
    const pauseEndedAt = pause.ended_at ? Date.parse(pause.ended_at) : now;
    return total + Math.max(0, pauseEndedAt - pauseStartedAt);
  }, 0);

  return Math.max(0, now - startedAt - pauseDuration);
}

function formatDuration(duration: number) {
  const totalSeconds = Math.floor(duration / 1_000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;
  return `${hours} h ${String(minutes).padStart(2, "0")} min ${String(seconds).padStart(2, "0")} s`;
}
