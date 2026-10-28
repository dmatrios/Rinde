"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BanknoteArrowUp, Fuel, Plus, ReceiptText } from "lucide-react";
import { EarningFormModal } from "@/features/earnings/earnings-workspace";
import type { EarningShift } from "@/features/earnings/queries";
import {
  CategoryModal,
  ExpenseFormModal,
  FuelFormModal,
} from "@/features/expenses/expenses-workspace";
import type {
  EarningsMode,
  ExpenseCategory,
  UserPlatform,
} from "@/types/database";

export type QuickRegisterData = {
  categories: ExpenseCategory[];
  defaultMode: EarningsMode;
  platforms: UserPlatform[];
  ruc: string | null;
  shifts: EarningShift[];
};

const actions = [
  { form: "earning", icon: BanknoteArrowUp, label: "Registrar ingreso" },
  { form: "expense", icon: ReceiptText, label: "Registrar gasto" },
  { form: "fuel", icon: Fuel, label: "Registrar recarga" },
] as const;

type FormName = (typeof actions)[number]["form"];

export function QuickRegisterMenu({
  categories,
  defaultMode,
  platforms,
  ruc,
  shifts,
}: QuickRegisterData) {
  const [open, setOpen] = useState(false);
  const [activeForm, setActiveForm] = useState<FormName | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const openCategoryManager = () => {
    setManagingCategories(true);
    window.setTimeout(() => {
      setActiveForm(null);
      window.requestAnimationFrame(() => {
        setCategoryModalOpen(true);
        setManagingCategories(false);
      });
    }, 180);
  };

  return (
    <div
      ref={containerRef}
      data-tour="quick-register"
      className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-5 z-50 lg:bottom-7 lg:right-7 xl:right-10"
    >
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Registro rápido"
          className="absolute bottom-[calc(100%+14px)] right-0 w-52 origin-bottom-right rounded-2xl border border-border/90 bg-card/95 p-1.5 shadow-[0_24px_48px_-24px_rgb(32_42_58_/_0.48)] backdrop-blur-sm animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-300 ease-out"
        >
          {actions.map(({ form, icon: Icon, label }) => (
            <button
              key={form}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setActiveForm(form);
              }}
              className="group flex min-h-12 items-center gap-3 rounded-xl px-2.5 text-left text-sm font-semibold transition-[background-color,transform] duration-200 hover:bg-secondary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25 active:scale-[0.98]"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon size={16} />
              </span>
              <span className="whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-controls={menuId}
        aria-expanded={open}
        aria-label={
          open ? "Cerrar opciones de registro" : "Abrir opciones de registro"
        }
        onClick={() => setOpen((current) => !current)}
        className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_16px_32px_-14px_rgb(194_65_12_/_0.65)] transition-[transform,box-shadow,background-color] duration-300 ease-out hover:scale-105 hover:bg-primary/90 hover:shadow-[0_20px_36px_-14px_rgb(194_65_12_/_0.72)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 active:scale-95"
      >
        <Plus
          size={24}
          strokeWidth={2.4}
          className={`transition-transform duration-300 ease-out ${open ? "rotate-45" : "rotate-0"}`}
        />
      </button>
      <EarningFormModal
        defaultMode={defaultMode}
        earning={null}
        open={activeForm === "earning"}
        platforms={platforms}
        shifts={shifts}
        onOpenChange={(nextOpen) => setActiveForm(nextOpen ? "earning" : null)}
      />
      <ExpenseFormModal
        categories={categories}
        expense={null}
        managingCategories={managingCategories}
        open={activeForm === "expense"}
        ruc={ruc}
        onOpenChange={(nextOpen) => setActiveForm(nextOpen ? "expense" : null)}
        onManageCategories={openCategoryManager}
      />
      <FuelFormModal
        open={activeForm === "fuel"}
        refill={null}
        onOpenChange={(nextOpen) => setActiveForm(nextOpen ? "fuel" : null)}
      />
      <CategoryModal
        categories={categories}
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
      />
    </div>
  );
}
