"use client";

import { useActionState, useEffect, useRef, useState, type ComponentProps } from "react";
import {
  Check,
  ChevronDown,
  ClipboardPenLine,
  Edit3,
  LoaderCircle,
  Plus,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ModalPopover } from "@/components/ui/modal-popover";
import { useToast } from "@/components/ui/toast";
import { saveEarning } from "@/features/earnings/actions";
import type { EarningsRecord, EarningShift } from "@/features/earnings/queries";
import { initialActionState } from "@/lib/auth/types";
import { earningGrossCents, formatMoney } from "@/lib/finance/money";
import type { EarningsMode, UserPlatform } from "@/types/database";

type WorkspaceProps = {
  defaultMode: EarningsMode;
  platforms: UserPlatform[];
  earnings: EarningsRecord[];
  openOnLoad?: boolean;
  shifts: EarningShift[];
};

export function EarningsWorkspace({
  defaultMode,
  platforms,
  earnings,
  openOnLoad = false,
  shifts,
}: WorkspaceProps) {
  const [open, setOpen] = useState(openOnLoad);
  const [editing, setEditing] = useState<EarningsRecord | null>(null);
  const today = peruDate();
  const todayEarnings = earnings.filter((earning) => earning.date === today);
  const todayTotal = todayEarnings.reduce(
    (total, earning) => total + earningGrossCents(earning),
    0,
  );

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">Tu registro de ingresos</p>
          <h1 className="text-3xl font-bold tracking-tight">Ingresos</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Registra lo que generaste y mantenlo claro para ti.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus />
          Registrar ingreso
        </Button>
      </div>

      <section className="overflow-hidden rounded-2xl bg-panel p-6 text-panel-foreground sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm text-white/75">
              <Wallet size={17} /> Ingresos brutos de hoy
            </p>
            <p className="mt-4 tabular text-4xl font-semibold tracking-tight sm:text-5xl">
              {todayEarnings.length ? formatMoney(todayTotal) : "—"}
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80">
            {todayEarnings.length
              ? `${todayEarnings.length} ${todayEarnings.length === 1 ? "registro" : "registros"}`
              : "Sin registros"}
          </span>
        </div>
        <p className="mt-4 text-xs leading-5 text-white/60">
          {todayEarnings.length
            ? "Incluye los extras que no estaban dentro del importe reportado."
            : "Cuando registres un ingreso, aquí verás el total del día."}
        </p>
      </section>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText size={18} /> Historial reciente
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Puedes corregir cualquier registro cuando lo necesites.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {earnings.length ? (
            <ul className="divide-y divide-border">
              {earnings.map((earning) => (
                <li
                  key={earning.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-1 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{earning.platformName}</p>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground">
                        {earning.mode === "daily" ? "Por día" : "Por jornada"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatBusinessDate(earning.date)}
                      {earning.orders !== null
                        ? ` · ${earning.orders} ${earning.orders === 1 ? "pedido" : "pedidos"}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="tabular text-sm font-semibold">
                      {formatMoney(earningGrossCents(earning))}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      onClick={() => {
                        setEditing(earning);
                        setOpen(true);
                      }}
                      aria-label={`Editar ingreso de ${earning.platformName}`}
                    >
                      <Edit3 size={16} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center text-center">
              <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <ClipboardPenLine size={20} />
              </div>
              <p className="text-sm font-medium">Aún no registraste ingresos.</p>
              <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
                Agrega lo que generaste por plataforma, ya sea por día o al cerrar una jornada.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <EarningFormModal
        key={`${editing?.id ?? "new"}-${open ? "open" : "closed"}`}
        defaultMode={defaultMode}
        earning={editing}
        open={open}
        platforms={platforms}
        shifts={shifts}
        onOpenChange={setOpen}
      />
    </div>
  );
}

export function EarningFormModal({
  defaultMode,
  earning,
  open,
  platforms,
  shifts,
  onOpenChange,
}: {
  defaultMode: EarningsMode;
  earning: EarningsRecord | null;
  open: boolean;
  platforms: UserPlatform[];
  shifts: EarningShift[];
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<EarningsMode>(earning?.mode ?? defaultMode);
  const [platformId, setPlatformId] = useState(earning?.platform_id ?? "");
  const [shiftId, setShiftId] = useState(earning?.shift_id ?? "");
  const [platformPickerOpen, setPlatformPickerOpen] = useState(false);
  const [shiftPickerOpen, setShiftPickerOpen] = useState(false);
  const [date, setDate] = useState(earning?.date ?? peruDate());
  const [reportedAmount, setReportedAmount] = useState(
    earning ? String(earning.reported_amount) : "",
  );
  const [tips, setTips] = useState(earning ? String(earning.tips) : "");
  const [bonuses, setBonuses] = useState(earning ? String(earning.bonuses) : "");
  const [orders, setOrders] = useState(
    earning?.orders ? String(earning.orders) : "",
  );
  const platformTriggerRef = useRef<HTMLButtonElement>(null);
  const shiftTriggerRef = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState(saveEarning, initialActionState);
  const { toast } = useToast();
  const previousState = useRef(initialActionState);

  useEffect(() => {
    if (!state.message || state === previousState.current) return;
    previousState.current = state;
    toast(state.message, state.status === "error" ? "error" : "success");
    if (state.status === "success") {
      window.requestAnimationFrame(() => onOpenChange(false));
    }
  }, [onOpenChange, state, toast]);

  const selectedPlatform = platforms.find((item) => item.id === platformId);
  const selectedShift = shifts.find((item) => item.id === shiftId);
  const usablePlatformId = mode === "shift" ? selectedShift?.platform_id ?? "" : platformId;
  const shiftDate = selectedShift
    ? peruDate(new Date(selectedShift.started_at))
    : "";
  const formTitle = earning ? "Editar ingreso" : "Registrar ingreso";

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setPlatformPickerOpen(false);
          setShiftPickerOpen(false);
        }
        onOpenChange(nextOpen);
      }}
      title={formTitle}
      description="Registra el total que te muestra la plataforma y los extras si los recibiste aparte."
      className="max-w-xl"
    >
      {platforms.length ? (
        <form
          key={`${earning?.id ?? "new"}-${open ? "open" : "closed"}`}
          action={action}
          className="space-y-5"
          aria-busy={pending}
        >
          <input type="hidden" name="earningId" value={earning?.id ?? ""} />
          <input
            type="hidden"
            name="expectedRevision"
            value={earning?.revision ?? ""}
          />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="platformId" value={usablePlatformId} />
          <input type="hidden" name="shiftId" value={mode === "shift" ? shiftId : ""} />
          {mode === "shift" && <input type="hidden" name="date" value={shiftDate} />}

          <fieldset>
            <legend className="mb-2 block text-xs font-semibold">Cómo lo registras</legend>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              <ModeButton
                active={mode === "daily"}
                onClick={() => {
                  setMode("daily");
                  setShiftId("");
                }}
              >
                Por día
              </ModeButton>
              <ModeButton active={mode === "shift"} onClick={() => setMode("shift")}>
                Por jornada
              </ModeButton>
            </div>
          </fieldset>

          {mode === "daily" ? (
            <Picker
              label="Plataforma"
              open={platformPickerOpen}
              onOpenChange={setPlatformPickerOpen}
              triggerRef={platformTriggerRef}
              value={selectedPlatform?.name ?? "Elige una plataforma"}
              disabled={pending}
            >
              {platforms.map((platform) => (
                <PickerOption
                  key={platform.id}
                  selected={platform.id === platformId}
                  onClick={() => {
                    setPlatformId(platform.id);
                    setPlatformPickerOpen(false);
                  }}
                >
                  {platform.name}
                </PickerOption>
              ))}
            </Picker>
          ) : (
            <Picker
              label="Jornada finalizada"
              open={shiftPickerOpen}
              onOpenChange={setShiftPickerOpen}
              triggerRef={shiftTriggerRef}
              value={
                selectedShift
                  ? `${selectedShift.platformName} · ${formatShiftSchedule(selectedShift.started_at, selectedShift.ended_at)}`
                  : "Elige una jornada"
              }
              disabled={pending || !shifts.length}
            >
              {shifts.length ? (
                shifts.map((shift) => (
                  <PickerOption
                    key={shift.id}
                    selected={shift.id === shiftId}
                    onClick={() => {
                      setShiftId(shift.id);
                      setShiftPickerOpen(false);
                    }}
                  >
                    <span>{shift.platformName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatShiftSchedule(shift.started_at, shift.ended_at)}
                    </span>
                  </PickerOption>
                ))
              ) : (
                <p className="px-3 py-2.5 text-sm text-muted-foreground">
                  Aún no tienes jornadas finalizadas.
                </p>
              )}
            </Picker>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha" htmlFor="earning-date">
              <DatePicker
                id="earning-date"
                name={mode === "shift" ? "date-display" : "date"}
                value={mode === "shift" && shiftDate ? shiftDate : date}
                onChange={setDate}
                disabled={pending || mode === "shift"}
              />
              {mode === "shift" && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Se toma la fecha de inicio de la jornada.
                </p>
              )}
            </Field>
            <Field label="Importe reportado" htmlFor="reported-amount">
              <MoneyInput
                id="reported-amount"
                name="reportedAmount"
                placeholder="0.00"
                value={reportedAmount}
                onChange={setReportedAmount}
                required
                disabled={pending}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Propinas" htmlFor="earning-tips">
              <MoneyInput
                id="earning-tips"
                name="tips"
                placeholder="0.00"
                value={tips}
                onChange={setTips}
                disabled={pending}
              />
            </Field>
            <Field label="Bonos" htmlFor="earning-bonuses">
              <MoneyInput
                id="earning-bonuses"
                name="bonuses"
                placeholder="0.00"
                value={bonuses}
                onChange={setBonuses}
                disabled={pending}
              />
            </Field>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-background/60 p-3.5">
            <InclusionCheck
              name="tipsIncluded"
              defaultChecked={earning?.tips_included ?? true}
              disabled={pending}
              label="Las propinas ya están incluidas en el importe reportado"
            />
            <InclusionCheck
              name="bonusesIncluded"
              defaultChecked={earning?.bonuses_included ?? true}
              disabled={pending}
              label="Los bonos ya están incluidos en el importe reportado"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
            <Field label="Pedidos" htmlFor="earning-orders">
              <NumberInput
                id="earning-orders"
                name="orders"
                placeholder="—"
                value={orders}
                onChange={setOrders}
                disabled={pending}
              />
            </Field>
            <Field label="Nota (opcional)" htmlFor="earning-notes">
              <textarea
                id="earning-notes"
                name="notes"
                maxLength={500}
                defaultValue={earning?.notes ?? ""}
                disabled={pending}
                className="flex min-h-12 w-full resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Algo que quieras recordar"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-1">
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
              disabled={pending || !usablePlatformId || (mode === "shift" && !shiftId)}
            >
              <span className={pending ? "invisible" : ""}>
                {earning ? "Guardar cambios" : "Guardar ingreso"}
              </span>
              {pending && <LoaderCircle className="absolute animate-spin" aria-hidden />}
              {pending && <span className="sr-only">Guardando</span>}
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <p className="text-sm leading-6 text-muted-foreground">
            Agrega una plataforma activa antes de registrar un ingreso.
          </p>
          <Button type="button" variant="ghost" size="sm" className="mt-5" onClick={() => onOpenChange(false)}>
            Entendido
          </Button>
        </div>
      )}
    </Modal>
  );
}

function Picker({
  children,
  disabled,
  label,
  onOpenChange,
  open,
  triggerRef,
  value,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  value: string;
}) {
  const labelId = `picker-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div>
      <span id={labelId} className="mb-2 block text-xs font-semibold">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        aria-labelledby={labelId}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => onOpenChange(!open)}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-card px-3.5 text-left text-sm transition-all duration-200 hover:border-muted-foreground/45 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={value.startsWith("Elige") ? "text-muted-foreground" : "text-foreground"}>
          {value}
        </span>
        <ChevronDown
          className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          size={18}
        />
      </button>
      {open && (
        <ModalPopover anchorRef={triggerRef} open={open} onOpenChange={onOpenChange}>
          <div role="listbox" aria-labelledby={labelId}>
            {children}
          </div>
        </ModalPopover>
      )}
    </div>
  );
}

function PickerOption({
  children,
  onClick,
  selected,
}: {
  children: React.ReactNode;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ${selected ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-muted"}`}
    >
      {children}
      {selected && <Check size={16} aria-hidden />}
    </button>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-xs font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}

function InclusionCheck({
  defaultChecked,
  disabled,
  label,
  name,
}: {
  defaultChecked: boolean;
  disabled: boolean;
  label: string;
  name: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-muted-foreground">
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-0.5 size-4 rounded border-input accent-primary"
      />
      {label}
    </label>
  );
}

function MoneyInput({
  onChange,
  value,
  ...props
}: Omit<ComponentProps<"input">, "onChange" | "type" | "value"> & {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      pattern="[0-9]*[.]?[0-9]{0,2}"
      maxLength={15}
      value={value}
      onChange={(event) => onChange(sanitizeDecimal(event.target.value))}
    />
  );
}

function NumberInput({
  onChange,
  value,
  ...props
}: Omit<ComponentProps<"input">, "onChange" | "type" | "value"> & {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      pattern="[0-9]*"
      maxLength={5}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
    />
  );
}

function sanitizeDecimal(value: string) {
  const compact = value.replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = compact.split(".");
  const decimal = decimalParts.join("").slice(0, 2);
  return decimalParts.length ? `${whole}.${decimal}` : whole;
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-lg px-3 text-sm font-medium transition-colors ${active ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function peruDate(value = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Lima",
});

function formatBusinessDate(value: string) {
  return dateFormatter.format(new Date(`${value}T12:00:00-05:00`));
}

const shiftTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Lima",
});

function formatShiftSchedule(startedAt: string, endedAt: string | null) {
  const date = formatBusinessDate(peruDate(new Date(startedAt)));
  const start = shiftTimeFormatter.format(new Date(startedAt));
  const end = endedAt ? shiftTimeFormatter.format(new Date(endedAt)) : "sin finalizar";
  return `${date} · ${start} — ${end}`;
}
