"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Modal } from "@/components/ui/modal";
import { ModalPopover } from "@/components/ui/modal-popover";
import { useToast } from "@/components/ui/toast";
import { initialActionState, type ActionState } from "@/lib/auth/types";
import {
  createPlatform,
  deletePlatform,
  setPlatformActive,
  updatePlatform,
} from "@/features/shifts/actions";
import {
  OTHER_PLATFORM_VALUE,
  PLATFORM_PRESETS,
} from "@/features/shifts/platform-options";
import type { UserPlatform } from "@/types/database";

export function PlatformManager({ platforms }: { platforms: UserPlatform[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserPlatform | null>(null);
  const [deleting, setDeleting] = useState<UserPlatform | null>(null);
  const { toast } = useToast();

  const notify = useCallback(
    (message: string, kind: "success" | "error" = "success") =>
      toast(message, kind),
    [toast],
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {platforms.length
            ? "Conecta las plataformas que usarás hoy."
            : "Agrega la plataforma con la que trabajas."}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus />
          Agregar
        </Button>
      </div>
      {platforms.length > 0 && (
        <ul className="mt-5 divide-y divide-border border-y border-border">
          {platforms.map((platform) => (
            <li key={platform.id} className="flex items-center gap-2 py-3">
              <span
                className={
                  platform.active
                    ? "size-2 rounded-full bg-primary"
                    : "size-2 rounded-full bg-status-inactive"
                }
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {platform.name}
              </span>
              <PlatformToggle platform={platform} onNotify={notify} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Editar ${platform.name}`}
                onClick={() => setEditing(platform)}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Eliminar ${platform.name}`}
                onClick={() => setDeleting(platform)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <PlatformCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onNotify={notify}
      />
      <PlatformEditModal
        platform={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onNotify={notify}
      />
      <PlatformDeleteModal
        platform={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onNotify={notify}
      />
    </div>
  );
}

function PlatformToggle({
  platform,
  onNotify,
}: {
  platform: UserPlatform;
  onNotify: (message: string, kind?: "success" | "error") => void;
}) {
  const [state, action, pending] = useActionState(
    setPlatformActive,
    initialActionState,
  );
  const lastState = useRef<ActionState>(initialActionState);

  useEffect(() => {
    if (!state.message || state === lastState.current) return;
    lastState.current = state;
    onNotify(state.message, state.status === "error" ? "error" : "success");
  }, [onNotify, state]);

  return (
    <form action={action} className="shrink-0" aria-busy={pending}>
      <input type="hidden" name="platformId" value={platform.id} />
      <input type="hidden" name="active" value={String(!platform.active)} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {platform.active ? "Desconectar" : "Conectar"}
      </Button>
    </form>
  );
}

function PlatformCreateModal({
  open,
  onOpenChange,
  onNotify,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotify: (message: string, kind?: "success" | "error") => void;
}) {
  const [selected, setSelected] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerTriggerRef = useRef<HTMLButtonElement>(null);
  const lastState = useRef<ActionState>(initialActionState);
  const [state, action, pending] = useActionState(
    createPlatform,
    initialActionState,
  );
  const isOther = selected === OTHER_PLATFORM_VALUE;
  const selectedLabel =
    selected === OTHER_PLATFORM_VALUE
      ? "Otra plataforma"
      : selected || "Selecciona una plataforma";

  const closeModal = useCallback(() => {
    setPickerOpen(false);
    setSelected("");
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!state.message || state === lastState.current) return;
    lastState.current = state;
    onNotify(state.message, state.status === "error" ? "error" : "success");
    if (state.status === "success") {
      window.requestAnimationFrame(closeModal);
    }
  }, [closeModal, onNotify, state]);

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) =>
        nextOpen ? onOpenChange(true) : closeModal()
      }
      title="Agregar plataforma"
      description="Elige una de las más usadas o agrega otra."
    >
      <form action={action} className="space-y-5" aria-busy={pending}>
        <input type="hidden" name="name" value={selected} />
        <div>
          <label
            id="new-platform-name-label"
            className="mb-2 block text-xs font-semibold"
          >
            Plataforma
          </label>
          <div>
            <button
              ref={pickerTriggerRef}
              type="button"
              aria-labelledby="new-platform-name-label"
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              onClick={() => setPickerOpen((current) => !current)}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-card px-3.5 text-left text-base transition-all duration-200 hover:border-muted-foreground/45 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/15"
            >
              <span
                className={
                  selected ? "text-foreground" : "text-muted-foreground"
                }
              >
                {selectedLabel}
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
                <div role="listbox" aria-labelledby="new-platform-name-label">
                  {[...PLATFORM_PRESETS, OTHER_PLATFORM_VALUE].map((name) => {
                    const label =
                      name === OTHER_PLATFORM_VALUE ? "Otra plataforma" : name;
                    const isSelected = selected === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelected(name);
                          setPickerOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                          isSelected
                            ? "bg-secondary text-secondary-foreground"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        {label}
                        {isSelected && <Check size={16} aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              </ModalPopover>
            )}
          </div>
        </div>
        {isOther && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-150">
            <label
              htmlFor="custom-platform-name"
              className="mb-2 block text-xs font-semibold"
            >
              Nombre de la plataforma
            </label>
            <Input
              id="custom-platform-name"
              name="customName"
              placeholder="Escribe el nombre"
              minLength={2}
              maxLength={50}
              required
              autoFocus
            />
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={closeModal}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando…" : "Agregar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PlatformEditModal({
  platform,
  onOpenChange,
  onNotify,
}: {
  platform: UserPlatform | null;
  onOpenChange: (open: boolean) => void;
  onNotify: (message: string, kind?: "success" | "error") => void;
}) {
  const [state, action, pending] = useActionState(
    updatePlatform,
    initialActionState,
  );
  const lastState = useRef<ActionState>(initialActionState);
  useEffect(() => {
    if (!state.message || state === lastState.current) return;
    lastState.current = state;
    onNotify(state.message, state.status === "error" ? "error" : "success");
    if (state.status === "success") {
      window.requestAnimationFrame(() => onOpenChange(false));
    }
  }, [onNotify, onOpenChange, state]);
  return (
    <Modal
      open={Boolean(platform)}
      onOpenChange={onOpenChange}
      title="Editar plataforma"
      description="Las jornadas anteriores conservarán esta misma plataforma."
    >
      {platform && (
        <form action={action} className="space-y-5" aria-busy={pending}>
          <input type="hidden" name="platformId" value={platform.id} />
          <label
            htmlFor="edit-platform-name"
            className="block text-xs font-semibold"
          >
            Nombre
          </label>
          <Input
            id="edit-platform-name"
            name="name"
            defaultValue={platform.name}
            minLength={2}
            maxLength={50}
            required
            autoFocus
          />
          <CashLimitField key={platform.id} initialValue={platform.cash_limit ?? null} />
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
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function CashLimitField({ initialValue }: { initialValue: number | null }) {
  const [value, setValue] = useState(initialValue === null ? "" : String(initialValue));
  return (
    <div>
      <label htmlFor="edit-platform-cash-limit" className="mb-2 block text-xs font-semibold">
        Límite de efectivo (opcional)
      </label>
      <NumericInput
        id="edit-platform-cash-limit"
        name="cashLimit"
        value={value}
        onValueChange={setValue}
        placeholder="Por ejemplo, 80.00"
        maxLength={15}
      />
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Si cobras más en efectivo durante una jornada, verás el excedente por separado.
      </p>
    </div>
  );
}

function PlatformDeleteModal({
  platform,
  onOpenChange,
  onNotify,
}: {
  platform: UserPlatform | null;
  onOpenChange: (open: boolean) => void;
  onNotify: (message: string, kind?: "success" | "error") => void;
}) {
  const [state, action, pending] = useActionState(
    deletePlatform,
    initialActionState,
  );

  const lastState = useRef<ActionState>(initialActionState);
  useEffect(() => {
    if (!state.message || state === lastState.current) return;
    lastState.current = state;
    onNotify(state.message, state.status === "error" ? "error" : "success");
    if (state.status === "success") {
      window.requestAnimationFrame(() => onOpenChange(false));
    }
  }, [onNotify, onOpenChange, state]);

  return (
    <Modal
      open={Boolean(platform)}
      onOpenChange={onOpenChange}
      title="Eliminar plataforma"
      description={
        platform
          ? `Eliminarás ${platform.name} de tu lista.`
          : "Eliminarás esta plataforma de tu lista."
      }
    >
      {platform && (
        <form action={action} className="space-y-5" aria-busy={pending}>
          <input type="hidden" name="platformId" value={platform.id} />
          <p className="text-sm leading-6 text-muted-foreground">
            Si ya tiene jornadas registradas, podrás desconectarla, pero no
            eliminarla para conservar tu historial.
          </p>
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
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Eliminando…" : "Eliminar"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
