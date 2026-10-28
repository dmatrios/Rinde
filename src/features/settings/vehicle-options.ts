export const VEHICLE_OPTIONS = ["Bicicleta", "Moto", "Carro"] as const;

export type VehicleOption = (typeof VEHICLE_OPTIONS)[number];

export function isVehicleOption(value: string): value is VehicleOption {
  return VEHICLE_OPTIONS.includes(value as VehicleOption);
}
