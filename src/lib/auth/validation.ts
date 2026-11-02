import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Ingresa un correo válido.")
  .max(254);
export const passwordSchema = z
  .string()
  .min(12, "Usa al menos 12 caracteres.")
  .max(128, "Usa como máximo 128 caracteres.");
export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Escribe al menos 2 caracteres.")
  .max(80, "Usa como máximo 80 caracteres.");
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresa tu contraseña.").max(128),
  rememberSession: z.preprocess((value) => value === "on", z.boolean()),
});
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});
export const recoverySchema = z.object({ email: emailSchema });
export const updatePasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });
export function safeAuthDestination(value: string | null) {
  return value === "/auth/update-password" ? value : "/app";
}
