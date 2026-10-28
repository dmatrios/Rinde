"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ModalPopover } from "@/components/ui/modal-popover";
import { NumericInput } from "@/components/ui/numeric-input";
import { useToast } from "@/components/ui/toast";
import { saveVehicle } from "@/features/settings/actions";
import {
  isVehicleOption,
  VEHICLE_OPTIONS,
  type VehicleOption,
} from "@/features/settings/vehicle-options";
import { initialActionState } from "@/lib/auth/types";
import type { Vehicle } from "@/types/database";

export function VehicleForm({ vehicle }: { vehicle: Vehicle | null }) {
  const [open, setOpen] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleOption | "">(
    vehicle && isVehicleOption(vehicle.name) ? vehicle.name : "",
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [odometerKm, setOdometerKm] = useState(
    vehicle?.odometer_km === null || vehicle?.odometer_km === undefined
      ? ""
      : String(vehicle.odometer_km),
  );
  const [state, action, pending] = useActionState(
    saveVehicle,
    initialActionState,
  );
  const previousState = useRef(initialActionState);
  const pickerTriggerRef = useRef<HTMLButtonElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!state.message || state === previousState.current) return;
    previousState.current = state;
    toast(state.message, state.status === "error" ? "error" : "success");
    if (state.status === "success") {
      window.requestAnimationFrame(() => setOpen(false));
    }
  }, [state, toast]);

  return (
    <div>
      {vehicle ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">{vehicle.name}</p>
          <p className="text-xs text-muted-foreground">
            {vehicle.odometer_km === null
              ? "Sin kilometraje inicial"
              : `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(vehicle.odometer_km)} km`}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Todavía no registraste un vehículo.
        </p>
      )}
      <Button
        type="button"
        size="sm"
        className="mt-5"
        onClick={() => setOpen(true)}
      >
        {vehicle ? "Editar vehículo" : "Registrar vehículo"}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={vehicle ? "Editar vehículo" : "Registrar vehículo"}
        description="Guarda el vehículo que usas para llevar mejor tus recargas y kilometraje."
      >
        <form action={action} className="space-y-5" aria-busy={pending}>
          <div>
            <label
              id="vehicle-type-label"
              className="mb-2 block text-xs font-semibold"
            >
              Vehículo
            </label>
            <input type="hidden" name="name" value={vehicleType} />
            <button
              ref={pickerTriggerRef}
              type="button"
              aria-labelledby="vehicle-type-label"
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              onClick={() => setPickerOpen((current) => !current)}
              disabled={pending}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-card px-3.5 text-left text-base transition-all duration-200 hover:border-muted-foreground/45 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span
                className={
                  vehicleType ? "text-foreground" : "text-muted-foreground"
                }
              >
                {vehicleType || "Elige tu vehículo"}
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
                <div role="listbox" aria-labelledby="vehicle-type-label">
                  {VEHICLE_OPTIONS.map((option) => {
                    const isSelected = option === vehicleType;
                    return (
                      <button
                        key={option}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setVehicleType(option);
                          setPickerOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                          isSelected
                            ? "bg-secondary text-secondary-foreground"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        {option}
                        {isSelected && <Check size={16} aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              </ModalPopover>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Selecciona el medio con el que haces tus entregas.
            </p>
          </div>
          <div>
            <label
              htmlFor="vehicle-odometer"
              className="mb-2 block text-xs font-semibold"
            >
              Kilometraje inicial (opcional)
            </label>
            <NumericInput
              id="vehicle-odometer"
              name="odometerKm"
              value={odometerKm}
              onValueChange={setOdometerKm}
              decimals={1}
              maxLength={15}
              placeholder="0.0"
              disabled={pending}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending || !vehicleType}>
              Guardar vehículo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
