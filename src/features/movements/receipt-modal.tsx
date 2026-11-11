"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ModalPopover } from "@/components/ui/modal-popover";
import { NumericInput } from "@/components/ui/numeric-input";
import { useToast } from "@/components/ui/toast";
import { initialActionState } from "@/lib/auth/types";
import { decimalToCents, formatMoney } from "@/lib/finance/money";
import {
  clearLocalDraft,
  readLocalDraft,
  updateLocalDraft,
} from "@/lib/drafts/local-draft";
import { savePaymentReceipt } from "./actions";
import type { PaymentMethod, UserPlatform, WorkShift } from "@/types/database";

const NO_SHIFTS: WorkShift[] = [];

export function ReceiptModal({
  userId,
  open,
  onOpenChange,
  platforms,
  shifts = NO_SHIFTS,
  shiftId = null,
  shiftPlatformId = null,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platforms: UserPlatform[];
  shifts?: WorkShift[];
  shiftId?: string | null;
  shiftPlatformId?: string | null;
}) {
  const [platformId, setPlatformId] = useState(shiftPlatformId ?? "");
  const [selectedShiftId, setSelectedShiftId] = useState(shiftId ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shiftPickerOpen, setShiftPickerOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [received, setReceived] = useState("");
  const [description, setDescription] = useState("");
  const draftKey = `receipt-${shiftId ?? "general"}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const shiftTriggerRef = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState(
    savePaymentReceipt,
    initialActionState,
  );
  const lastState = useRef(initialActionState);
  const { toast } = useToast();

  useEffect(() => {
    if (!state.message || state === lastState.current) return;
    lastState.current = state;
    toast(state.message, state.status === "error" ? "error" : "success");
    if (state.status === "success") {
      clearLocalDraft(userId, draftKey);
      onOpenChange(false);
    }
  }, [state, toast, onOpenChange, userId, draftKey]);

  useEffect(() => {
    if (!open) return;
    const draft = readLocalDraft(userId, draftKey);
    if (!draft) return;
    const frame = window.requestAnimationFrame(() => {
      const restoredPlatformId =
        draft.platformId && platforms.some((item) => item.id === draft.platformId)
          ? draft.platformId
          : shiftPlatformId ?? "";
      setPlatformId(restoredPlatformId);
      if (draft.shiftId !== undefined) {
        const activeMatch = draft.shiftId === shiftId && restoredPlatformId === shiftPlatformId;
        const completedMatch = shifts.some(
          (item) => item.id === draft.shiftId && item.platform_id === restoredPlatformId,
        );
        setSelectedShiftId(activeMatch || completedMatch ? draft.shiftId : "");
      } else if (restoredPlatformId !== shiftPlatformId) {
        setSelectedShiftId("");
      }
      if (
        draft.method &&
        ["cash", "yape", "plin", "card"].includes(draft.method)
      )
        setMethod(draft.method as PaymentMethod);
      setAmount(draft.amount ?? "");
      setReceived(draft.received ?? "");
      setDescription(draft.description ?? "");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, userId, draftKey, shiftId, shiftPlatformId, platforms, shifts]);

  const completedShifts = shifts.filter(
    (item) => item.platform_id === platformId && item.status === "completed",
  );
  const hasActiveShift = !!shiftId && platformId === shiftPlatformId;
  const selectedCompletedShift = completedShifts.find(
    (item) => item.id === selectedShiftId,
  );
  const selectedShiftLabel =
    selectedShiftId && hasActiveShift && selectedShiftId === shiftId
      ? "Jornada actual"
      : selectedCompletedShift
        ? formatShiftSchedule(selectedCompletedShift)
        : "Sin jornada";

  const change =
    method === "cash" && amount && received
      ? Math.max(0, decimalToCents(received) - decimalToCents(amount))
      : 0;

  const selectShift = (nextShiftId: string) => {
    setSelectedShiftId(nextShiftId);
    updateLocalDraft(userId, draftKey, { platformId, shiftId: nextShiftId });
    setShiftPickerOpen(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setPickerOpen(false);
          setShiftPickerOpen(false);
        }
        onOpenChange(nextOpen);
      }}
      title="Registrar cobro"
      description="Guarda lo que recibiste y cómo te pagaron."
    >
      <form action={action} className="space-y-5" aria-busy={pending}>
        <input type="hidden" name="shiftId" value={selectedShiftId} />
        <input
          type="hidden"
          name="platformId"
          value={platformId}
        />
        {shiftPlatformId && platforms.length === 1 ? (
          <p className="rounded-xl bg-secondary px-3.5 py-3 text-sm">
            {platforms.find((platform) => platform.id === shiftPlatformId)
              ?.name ?? "Tu jornada"}
          </p>
        ) : (
          <div>
            <p className="mb-2 text-xs font-semibold">Plataforma</p>
            <button
              ref={triggerRef}
              type="button"
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              onClick={() => setPickerOpen(!pickerOpen)}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-card px-3.5 text-left text-sm"
            >
              {platforms.find((platform) => platform.id === platformId)?.name ??
                "Elige una plataforma"}
              <ChevronDown size={17} />
            </button>
            <ModalPopover
              anchorRef={triggerRef}
              open={pickerOpen}
              onOpenChange={setPickerOpen}
            >
              <div role="listbox" aria-label="Plataformas">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    role="option"
                    aria-selected={platform.id === platformId}
                    onClick={() => {
                      setPlatformId(platform.id);
                      const nextShiftId =
                        platform.id === shiftPlatformId ? shiftId ?? "" : "";
                      setSelectedShiftId(nextShiftId);
                      updateLocalDraft(userId, draftKey, {
                        platformId: platform.id,
                        shiftId: nextShiftId,
                      });
                      setPickerOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted"
                  >
                    {platform.name}
                    {platform.id === platformId && <Check size={15} />}
                  </button>
                ))}
              </div>
            </ModalPopover>
          </div>
        )}
        <div>
          <p className="mb-2 text-xs font-semibold">Jornada (opcional)</p>
          <button
            ref={shiftTriggerRef}
            type="button"
            aria-expanded={shiftPickerOpen}
            aria-haspopup="listbox"
            disabled={!platformId || pending}
            onClick={() => setShiftPickerOpen(!shiftPickerOpen)}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-input bg-card px-3.5 text-left text-sm disabled:opacity-50"
          >
            <span className="min-w-0 truncate">
              {platformId ? selectedShiftLabel : "Elige primero una plataforma"}
            </span>
            <ChevronDown size={17} className="shrink-0" />
          </button>
          <ModalPopover
            anchorRef={shiftTriggerRef}
            open={shiftPickerOpen}
            onOpenChange={setShiftPickerOpen}
          >
            <div role="listbox" aria-label="Jornadas de esta plataforma">
              <ShiftOption
                label="Sin jornada"
                selected={!selectedShiftId}
                onClick={() => selectShift("")}
              />
              {hasActiveShift && shiftId && (
                <ShiftOption
                  label="Jornada actual"
                  selected={selectedShiftId === shiftId}
                  onClick={() => selectShift(shiftId)}
                />
              )}
              {completedShifts.map((item) => (
                <ShiftOption
                  key={item.id}
                  label={formatShiftSchedule(item)}
                  selected={selectedShiftId === item.id}
                  onClick={() => selectShift(item.id)}
                />
              ))}
            </div>
          </ModalPopover>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {completedShifts.length || hasActiveShift
              ? "Elige la jornada a la que corresponde este cobro."
              : "Puedes asociar el cobro a una jornada más adelante."}
          </p>
        </div>
        <div>
          <label
            htmlFor="receipt-amount"
            className="mb-2 block text-xs font-semibold"
          >
            Importe cobrado
          </label>
          <NumericInput
            id="receipt-amount"
            name="amount"
            value={amount}
            onValueChange={(value) => {
              setAmount(value);
              updateLocalDraft(userId, draftKey, { amount: value });
            }}
            placeholder="0.00"
            maxLength={15}
            required
            disabled={pending}
          />
        </div>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold">Te pagaron con</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["cash", "Efectivo"],
                ["yape", "Yape"],
                ["plin", "Plin"],
                ["card", "Tarjeta"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={value}
                  checked={method === value}
                  onChange={() => {
                    setMethod(value);
                    updateLocalDraft(userId, draftKey, { method: value });
                  }}
                  className="peer sr-only"
                  disabled={pending}
                />
                <span className="flex min-h-10 items-center justify-center rounded-xl border border-input text-xs font-medium peer-checked:border-primary peer-checked:bg-secondary peer-checked:text-primary">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {method === "cash" && (
          <div>
            <label
              htmlFor="receipt-cash"
              className="mb-2 block text-xs font-semibold"
            >
              Efectivo recibido
            </label>
            <NumericInput
              id="receipt-cash"
              name="cashReceived"
              value={received}
              onValueChange={(value) => {
                setReceived(value);
                updateLocalDraft(userId, draftKey, { received: value });
              }}
              placeholder="0.00"
              maxLength={15}
              required
              disabled={pending}
            />
            {amount && received && (
              <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">
                Vuelto: <strong>{formatMoney(change)}</strong>
              </p>
            )}
          </div>
        )}
        <div>
          <label
            htmlFor="receipt-description"
            className="mb-2 block text-xs font-semibold"
          >
            Detalle (opcional)
          </label>
          <Input
            id="receipt-description"
            name="description"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              updateLocalDraft(userId, draftKey, {
                description: event.target.value,
              });
            }}
            placeholder="Por ejemplo, pedido 123"
            maxLength={120}
            disabled={pending}
          />
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Este cobro es dinero recibido por un pedido. Tu ganancia se registra aparte.
        </p>
        <p className="text-xs text-muted-foreground">
          Este borrador se conserva en tu dispositivo si pierdes conexión.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={
              pending ||
              !platformId ||
              !amount ||
              (method === "cash" &&
                (!received ||
                  decimalToCents(received) < decimalToCents(amount)))
            }
          >
            {pending ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : (
              "Guardar cobro"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ShiftOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted"
    >
      <span>{label}</span>
      {selected && <Check size={15} className="shrink-0 text-primary" />}
    </button>
  );
}

function formatShiftSchedule(shift: WorkShift) {
  const day = new Intl.DateTimeFormat("es-PE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Lima",
  }).format(new Date(shift.started_at));
  const time = (value: string) => new Intl.DateTimeFormat("es-PE", {
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));
  return `${day} · ${time(shift.started_at)} a ${shift.ended_at ? time(shift.ended_at) : "en curso"}`;
}
