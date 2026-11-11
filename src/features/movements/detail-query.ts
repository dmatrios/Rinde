import "server-only";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { decimalToCents, earningGrossCents, formatMoney } from "@/lib/finance/money";
import type { PaymentMethod, WorkShift } from "@/types/database";

export type MovementKind = "receipt" | "earning" | "expense" | "fuel";
export type MovementDetail = {
  id: string;
  kind: MovementKind;
  title: string;
  cents: number;
  occurredAt: string;
  method: PaymentMethod | null;
  cashAmountCents: number | null;
  description: string | null;
  rows: Array<{ label: string; value: string }>;
  shift: Pick<WorkShift, "id" | "started_at" | "ended_at"> | null;
  candidates: Array<Pick<WorkShift, "id" | "started_at" | "ended_at">>;
  editHref: string | null;
};

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getMovementDetail(
  kind: string,
  id: string,
): Promise<MovementDetail | null> {
  if (!idPattern.test(id) || !["receipt", "earning", "expense", "fuel"].includes(kind))
    return null;
  const user = await requireUser();
  const supabase = await createClient();

  if (kind === "receipt") {
    const { data: receipt, error } = await supabase
      .from("payment_receipts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error("No pudimos cargar este cobro.");
    if (!receipt) return null;
    const [platformResult, shiftResult, candidatesResult] =
      await Promise.all([
        supabase
          .from("user_platforms")
          .select("name")
          .eq("id", receipt.platform_id)
          .eq("user_id", user.id)
          .maybeSingle(),
        ownedShift(supabase, user.id, receipt.shift_id),
        receipt.shift_id === null
          ? supabase
              .from("work_shifts")
              .select("id, started_at, ended_at")
              .eq("user_id", user.id)
              .eq("platform_id", receipt.platform_id)
              .eq("status", "completed")
              .order("started_at", { ascending: false })
              .limit(60)
          : Promise.resolve({ data: [], error: null }),
      ]);
    if (platformResult.error || candidatesResult.error)
      throw new Error("No pudimos cargar este cobro.");
    return {
      id,
      kind: "receipt",
      title: receipt.description || "Cobro registrado",
      cents: decimalToCents(receipt.amount),
      occurredAt: receipt.occurred_at,
      method: receipt.payment_method,
      cashAmountCents:
        receipt.cash_received === null ? null : decimalToCents(receipt.cash_received),
      description: receipt.description,
      rows: [{ label: "Plataforma", value: platformResult.data?.name ?? "Plataforma" }],
      shift: shiftResult,
      candidates: candidatesResult.data,
      editHref: null,
    };
  }

  if (kind === "earning") {
    const { data: earning, error } = await supabase
      .from("earnings")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error("No pudimos cargar este ingreso.");
    if (!earning) return null;
    const [platform, shift] = await Promise.all([
      supabase
        .from("user_platforms")
        .select("name")
        .eq("id", earning.platform_id)
        .eq("user_id", user.id)
        .maybeSingle(),
      ownedShift(supabase, user.id, earning.shift_id),
    ]);
    if (platform.error) throw new Error("No pudimos cargar este ingreso.");
    return {
      id,
      kind: "earning",
      title: "Ingreso total",
      cents: earningGrossCents(earning),
      occurredAt: earning.created_at,
      method: null,
      cashAmountCents: null,
      description: earning.notes,
      rows: [
        { label: "Plataforma", value: platform.data?.name ?? "Plataforma" },
        { label: "Registro", value: earning.mode === "shift" ? "Por jornada" : "Por día" },
        { label: "Día", value: formatDate(earning.date) },
        { label: "Importe reportado", value: formatMoney(decimalToCents(earning.reported_amount)) },
        ...(earning.orders !== null ? [{ label: "Pedidos", value: String(earning.orders) }] : []),
      ],
      shift,
      candidates: [],
      editHref: "/app/earnings",
    };
  }

  if (kind === "expense") {
    const { data: expense, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error("No pudimos cargar este gasto.");
    if (!expense) return null;
    const [category, shift] = await Promise.all([
      supabase
        .from("expense_categories")
        .select("name, kind")
        .eq("id", expense.category_id)
        .eq("user_id", user.id)
        .maybeSingle(),
      ownedShift(supabase, user.id, expense.shift_id),
    ]);
    if (category.error) throw new Error("No pudimos cargar este gasto.");
    return {
      id,
      kind: "expense",
      title: expense.description,
      cents: decimalToCents(expense.amount),
      occurredAt: expense.occurred_at,
      method: expense.payment_method,
      cashAmountCents: expense.cash_paid === null ? null : decimalToCents(expense.cash_paid),
      description: expense.notes,
      rows: [
        { label: "Categoría", value: category.data?.name ?? "Categoría" },
        { label: "Tipo", value: category.data?.kind === "personal" ? "Personal" : "Operativo" },
        ...(expense.paid_with_ruc ? [{ label: "Comprobante", value: "Con RUC" }] : []),
      ],
      shift,
      candidates: [],
      editHref: `/app/expenses?edit=${id}`,
    };
  }

  const { data: fuel, error } = await supabase
    .from("fuel_refills")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("No pudimos cargar esta recarga.");
  if (!fuel) return null;
  const shift = await ownedShift(supabase, user.id, fuel.shift_id);
  return {
    id,
    kind: "fuel",
    title: "Recarga de combustible",
    cents: decimalToCents(fuel.amount),
    occurredAt: fuel.occurred_at,
    method: fuel.payment_method,
    cashAmountCents: fuel.cash_paid === null ? null : decimalToCents(fuel.cash_paid),
    description: fuel.notes,
    rows: [
      ...(fuel.liters !== null ? [{ label: "Litros", value: String(fuel.liters) }] : []),
      ...(fuel.odometer_km !== null ? [{ label: "Kilometraje", value: `${fuel.odometer_km} km` }] : []),
      { label: "Tanque", value: fuel.full_tank ? "Lleno" : "Parcial" },
    ],
    shift,
    candidates: [],
    editHref: `/app/expenses?editFuel=${id}`,
  };
}

async function ownedShift(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  shiftId: string | null,
) {
  if (!shiftId) return null;
  const { data, error } = await supabase
    .from("work_shifts")
    .select("id, started_at, ended_at")
    .eq("id", shiftId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("No pudimos cargar la jornada vinculada.");
  return data;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00Z`));
}
