import { z } from "zod";

const amount = z
  .string()
  .trim()
  .regex(/^\d{1,12}(?:\.\d{1,2})?$/, "Usa un importe válido de hasta dos decimales.")
  .transform((value) => {
    const [rawWhole, decimal = ""] = value.split(".");
    const whole = rawWhole ?? "0";
    return `${whole.replace(/^0+(?=\d)/, "") || "0"}.${`${decimal}00`.slice(0, 2)}`;
  });

const optionalAmount = z
  .string()
  .trim()
  .transform((value) => (value === "" ? "0" : value))
  .pipe(amount);

export const earningFormSchema = z.object({
  earningId: z.string().uuid().optional(),
  expectedRevision: z.coerce.number().int().positive().optional(),
  mode: z.enum(["daily", "shift"]),
  platformId: z.string().uuid("Elige una plataforma."),
  shiftId: z.string().uuid().optional(),
  date: z.string().date("Elige una fecha válida."),
  reportedAmount: amount,
  tips: optionalAmount,
  bonuses: optionalAmount,
  tipsIncluded: z.boolean(),
  bonusesIncluded: z.boolean(),
  orders: z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : Number(value)))
    .refine(
      (value) =>
        value === undefined ||
        (Number.isInteger(value) && value >= 0 && value <= 10000),
      "Revisa el número de pedidos.",
    ),
  notes: z.string().trim().max(500, "Usa como máximo 500 caracteres."),
});
