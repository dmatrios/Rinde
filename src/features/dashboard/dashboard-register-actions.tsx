"use client";

import { useState } from "react";
import { BanknoteArrowUp, Fuel, ReceiptText, Wallet } from "lucide-react";
import type { QuickRegisterData } from "@/components/layout/quick-register-menu";
import { EarningFormModal } from "@/features/earnings/earnings-workspace";
import {
  CategoryModal,
  ExpenseFormModal,
  FuelFormModal,
} from "@/features/expenses/expenses-workspace";
import { ReceiptModal } from "@/features/movements/receipt-modal";

type FormName = "receipt" | "expense" | "fuel" | "earning";

const actions = [
  {
    id: "receipt",
    label: "Registrar cobro",
    detail: "Efectivo, Yape, Plin o tarjeta",
    icon: BanknoteArrowUp,
  },
  {
    id: "expense",
    label: "Registrar gasto",
    detail: "Dentro o fuera de tu jornada",
    icon: ReceiptText,
  },
  {
    id: "fuel",
    label: "Registrar recarga",
    detail: "Combustible y kilometraje",
    icon: Fuel,
  },
  {
    id: "earning",
    label: "Total de plataforma",
    detail: "El importe que muestra tu app",
    icon: Wallet,
  },
] as const;

export function DashboardRegisterActions({
  userId,
  activeShiftId,
  activeShiftPlatformId,
  categories,
  defaultMode,
  platforms,
  ruc,
  shifts,
}: QuickRegisterData) {
  const [activeForm, setActiveForm] = useState<FormName | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);

  const openCategories = () => {
    setManagingCategories(true);
    window.setTimeout(() => {
      setActiveForm(null);
      window.requestAnimationFrame(() => {
        setCategoryOpen(true);
        setManagingCategories(false);
      });
    }, 180);
  };

  return (
    <section data-tour="quick-actions" aria-labelledby="register-title">
      <div className="mb-3">
        <h2 id="register-title" className="text-base font-semibold">
          Registrar ahora
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tus cobros y gastos aparecerán en tu resumen.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map(({ id, label, detail, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveForm(id)}
            className="group flex min-h-28 flex-col items-start rounded-2xl border border-border bg-card p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon size={18} />
            </span>
            <span className="mt-3 text-sm font-semibold">{label}</span>
            <span className="mt-1 text-xs leading-4 text-muted-foreground">
              {detail}
            </span>
          </button>
        ))}
      </div>
      <ReceiptModal
        userId={userId}
        key={activeForm === "receipt" ? "receipt-open" : "receipt-closed"}
        open={activeForm === "receipt"}
        onOpenChange={(open) => setActiveForm(open ? "receipt" : null)}
        platforms={platforms}
        shiftId={activeShiftId}
        shiftPlatformId={activeShiftPlatformId}
      />
      <ExpenseFormModal
        userId={userId}
        key={activeForm === "expense" ? "expense-open" : "expense-closed"}
        activeShiftId={activeShiftId}
        categories={categories}
        expense={null}
        managingCategories={managingCategories}
        open={activeForm === "expense"}
        ruc={ruc}
        onOpenChange={(open) => setActiveForm(open ? "expense" : null)}
        onManageCategories={openCategories}
      />
      <FuelFormModal
        key={activeForm === "fuel" ? "fuel-open" : "fuel-closed"}
        activeShiftId={activeShiftId}
        open={activeForm === "fuel"}
        refill={null}
        onOpenChange={(open) => setActiveForm(open ? "fuel" : null)}
      />
      <EarningFormModal
        defaultMode={defaultMode}
        earning={null}
        open={activeForm === "earning"}
        platforms={platforms}
        shifts={shifts}
        onOpenChange={(open) => setActiveForm(open ? "earning" : null)}
      />
      <CategoryModal
        categories={categories}
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
      />
    </section>
  );
}
