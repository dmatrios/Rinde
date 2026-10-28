export const OTHER_PLATFORM_VALUE = "__other_platform__";

export const PLATFORM_PRESETS = [
  "PedidosYa",
  "Rappi",
  "inDrive",
  "Uber Eats",
  "DiDi Food",
] as const;

export function normalizePlatformName(name: string) {
  return name.trim().toLocaleLowerCase("es-PE").replace(/\s+/g, "");
}
