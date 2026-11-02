import { z } from "zod";

const money = z
  .string()
  .trim()
  .regex(
    /^\d{1,12}(?:\.\d{1,2})?$/,
    "Usa un importe válido de hasta dos decimales.",
  )
  .refine((value) => Number(value) > 0, "El importe debe ser mayor que cero.")
  .transform((value) => {
    const [whole = "0", decimal = ""] = value.split(".");
    return `${whole.replace(/^0+(?=\d)/, "") || "0"}.${`${decimal}00`.slice(0, 2)}`;
  });

export const paymentMethodSchema = z.enum(["cash", "yape", "plin", "card"]);
const optionalCashPaid = z.union([money, z.literal("")]);

const optionalDecimal = (maxDecimals: number, maxValue: number) =>
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .refine(
      (value) =>
        value === undefined ||
        new RegExp(`^\\d{1,12}(?:\\.\\d{1,${maxDecimals}})?$`).test(value),
      "Revisa el valor.",
    )
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .refine(
      (value) => value === undefined || value <= maxValue,
      "Revisa el valor.",
    );

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Escribe al menos 2 caracteres.").max(50),
  kind: z.enum(["operational", "personal"]),
});

export const expenseSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid("Elige una categoría."),
  date: z.string().date("Elige una fecha válida."),
  amount: money,
  description: z.string().trim().min(2, "Describe el gasto.").max(120),
  notes: z.string().trim().max(500),
  paidWithRuc: z.boolean(),
  paymentMethod: paymentMethodSchema,
  cashPaid: optionalCashPaid,
  includeShift: z.boolean(),
});

export const fuelSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.string().date("Elige una fecha válida."),
  amount: money,
  liters: optionalDecimal(3, 9999999),
  odometerKm: optionalDecimal(1, 9999999),
  fullTank: z.boolean(),
  notes: z.string().trim().max(500),
  paymentMethod: paymentMethodSchema,
  cashPaid: optionalCashPaid,
  includeShift: z.boolean(),
});

export const recurringSchema = z.object({
  categoryId: z.string().uuid("Elige una categoría."),
  description: z.string().trim().min(2, "Describe el gasto.").max(120),
  amount: money,
  cadence: z.enum(["weekly", "monthly"]),
  anchorDate: z.string().date("Elige una fecha válida."),
});
