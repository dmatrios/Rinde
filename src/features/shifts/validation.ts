import { z } from "zod";

export const platformNameSchema = z
  .string()
  .trim()
  .min(2, "Escribe al menos 2 caracteres.")
  .max(50, "Usa como máximo 50 caracteres.");

export const platformIdSchema = z.string().uuid("La plataforma no es válida.");

const optionalOdometerSchema = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .refine(
    (value) => value === null || /^\d{1,7}(?:\.\d)?$/.test(value),
    "Ingresa un kilometraje válido.",
  )
  .transform((value) => (value === null ? null : Number(value)))
  .refine(
    (value) => value === null || value < 10_000_000,
    "Ingresa un kilometraje válido.",
  );

export const startShiftSchema = z.object({
  platformId: platformIdSchema,
  odometerStart: optionalOdometerSchema,
});

export const shiftTransitionSchema = z.object({
  shiftId: z.string().uuid("La jornada no es válida."),
  action: z.enum(["pause", "resume", "finish"]),
  odometerEnd: optionalOdometerSchema,
});
