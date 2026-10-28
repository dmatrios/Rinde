"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  CarFront,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Edit3,
  Fuel,
  Layers3,
  LoaderCircle,
  Plus,
  ReceiptText,
  Repeat2,
  Search,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ModalPopover } from "@/components/ui/modal-popover";
import { NumericInput } from "@/components/ui/numeric-input";
import { useToast } from "@/components/ui/toast";
import {
  recordRecurringExpense,
  deleteCategory,
  saveCategory,
  saveExpense,
  saveFuelRefill,
  saveRecurringExpense,
  setCategoryActive,
  setRecurringExpenseActive,
} from "@/features/expenses/actions";
import type {
  ExpenseRecord,
  RecurringRecord,
} from "@/features/expenses/queries";
import { initialActionState } from "@/lib/auth/types";
import { decimalToCents, formatMoney } from "@/lib/finance/money";
import type { ExpenseCategory, FuelRefill } from "@/types/database";

type WorkspaceProps = {
  categories: ExpenseCategory[];
  expenses: ExpenseRecord[];
  fuel: FuelRefill[];
  manageCategories?: boolean;
  quickAction?: "expense" | "fuel";
  recurring: RecurringRecord[];
  ruc: string | null;
};

export function ExpensesWorkspace({
  categories,
  expenses,
  fuel,
  manageCategories = false,
  quickAction,
  recurring,
  ruc,
}: WorkspaceProps) {
  const [expenseModalOpen, setExpenseModalOpen] = useState(
    quickAction === "expense",
  );
  const [fuelModalOpen, setFuelModalOpen] = useState(quickAction === "fuel");
  const [categoryModalOpen, setCategoryModalOpen] = useState(manageCategories);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(
    null,
  );
  const [editingFuel, setEditingFuel] = useState<FuelRefill | null>(null);
  const [managingCategoriesFrom, setManagingCategoriesFrom] = useState<
    "expense" | "recurring" | null
  >(null);
  const currentMonth = peruDate().slice(0, 7);
  const monthExpenses = expenses.filter((expense) =>
    peruDate(new Date(expense.occurred_at)).startsWith(currentMonth),
  );
  const monthTotal = monthExpenses.reduce(
    (total, expense) => total + decimalToCents(expense.amount),
    0,
  );
  const operationalTotal = monthExpenses
    .filter((expense) => expense.categoryKind === "operational")
    .reduce((total, expense) => total + decimalToCents(expense.amount), 0);
  const openCategoryManager = (source: "expense" | "recurring") => {
    setManagingCategoriesFrom(source);
    window.setTimeout(() => {
      if (source === "expense") setExpenseModalOpen(false);
      else setRecurringModalOpen(false);
      window.requestAnimationFrame(() => {
        setCategoryModalOpen(true);
        setManagingCategoriesFrom(null);
      });
    }, 180);
  };

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            Ordena lo que usas en tu trabajo y tu día
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Gastos y combustible
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Registra lo importante para entender mejor en qué se va tu dinero.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCategoryModalOpen(true)}
          >
            <Tag /> Categorías
          </Button>
          <Button
            type="button"
            onClick={() => {
              setEditingExpense(null);
              setExpenseModalOpen(true);
            }}
          >
            <Plus /> Registrar gasto
          </Button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Gastos del mes"
          value={monthTotal ? formatMoney(monthTotal) : "—"}
          icon={<CircleDollarSign size={18} />}
        />
        <SummaryCard
          label="Operativos"
          value={operationalTotal ? formatMoney(operationalTotal) : "—"}
          icon={<CarFront size={18} />}
        />
        <SummaryCard
          label="Categorías activas"
          value={String(
            categories.filter((category) => category.active).length,
          )}
          icon={<Layers3 size={18} />}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText size={18} /> Gastos recientes
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Mantén cada registro claro y fácil de corregir.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {expenses.length ? (
              <ul className="divide-y divide-border">
                {expenses.map((expense) => (
                  <li
                    key={expense.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{expense.description}</p>
                        <CategoryKindBadge kind={expense.categoryKind} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {expense.categoryName} ·{" "}
                        {formatDate(expense.occurred_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="tabular text-sm font-semibold">
                        {formatMoney(decimalToCents(expense.amount))}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9"
                        onClick={() => {
                          setEditingExpense(expense);
                          setExpenseModalOpen(true);
                        }}
                        aria-label={`Editar ${expense.description}`}
                      >
                        <Edit3 size={16} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<ClipboardList size={20} />}
                title="Aún no registraste gastos."
                description="Cuando anotes uno, lo verás aquí junto a su categoría y fecha."
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Repeat2 size={18} /> Gastos frecuentes
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Para lo que se repite en tu rutina.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => setRecurringModalOpen(true)}
                aria-label="Agregar gasto frecuente"
              >
                <Plus size={17} />
              </Button>
            </CardHeader>
            <CardContent>
              {recurring.length ? (
                <ul className="space-y-3">
                  {recurring.map((rule) => (
                    <RecurringItem key={rule.id} rule={rule} />
                  ))}
                </ul>
              ) : (
                <p className="text-xs leading-5 text-muted-foreground">
                  Guarda un gasto frecuente y podrás registrarlo con un toque
                  cuando corresponda.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Fuel size={18} /> Combustible
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Registra recargas y kilometraje.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => {
                  setEditingFuel(null);
                  setFuelModalOpen(true);
                }}
                aria-label="Registrar recarga"
              >
                <Plus size={17} />
              </Button>
            </CardHeader>
            <CardContent>
              {fuel.length ? (
                <ul className="divide-y divide-border">
                  {fuel.slice(0, 4).map((refill) => (
                    <li
                      key={refill.id}
                      className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {formatMoney(decimalToCents(refill.amount))}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(refill.occurred_at)}
                          {refill.liters
                            ? ` · ${formatDecimal(refill.liters, 2)} L`
                            : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => {
                          setEditingFuel(refill);
                          setFuelModalOpen(true);
                        }}
                        aria-label="Editar recarga"
                      >
                        <Edit3 size={15} />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-3 text-xs leading-5 text-muted-foreground">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Fuel size={16} />
                  </span>{" "}
                  Aún no registraste una recarga.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ExpenseFormModal
        key={`expense-${editingExpense?.id ?? "new"}-${expenseModalOpen}`}
        categories={categories}
        expense={editingExpense}
        managingCategories={managingCategoriesFrom === "expense"}
        open={expenseModalOpen}
        ruc={ruc}
        onOpenChange={setExpenseModalOpen}
        onManageCategories={() => openCategoryManager("expense")}
      />
      <FuelFormModal
        key={`fuel-${editingFuel?.id ?? "new"}-${fuelModalOpen}`}
        refill={editingFuel}
        open={fuelModalOpen}
        onOpenChange={setFuelModalOpen}
      />
      <CategoryModal
        key={`category-${categoryModalOpen ? "open" : "closed"}`}
        categories={categories}
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
      />
      <RecurringFormModal
        key={`recurring-${recurringModalOpen ? "open" : "closed"}`}
        categories={categories}
        managingCategories={managingCategoriesFrom === "recurring"}
        open={recurringModalOpen}
        onOpenChange={setRecurringModalOpen}
        onManageCategories={() => openCategoryManager("recurring")}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-3 tabular text-2xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}

function CategoryKindBadge({ kind }: { kind: ExpenseCategory["kind"] }) {
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
      {kind === "operational" ? "Operativo" : "Personal"}
    </span>
  );
}

function EmptyState({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function RecurringItem({ rule }: { rule: RecurringRecord }) {
  const [state, action, pending] = useActionState(
    recordRecurringExpense,
    initialActionState,
  );
  const [statusState, statusAction, statusPending] = useActionState(
    setRecurringExpenseActive,
    initialActionState,
  );
  const { toast } = useToast();
  const previousStateRef = useRef(initialActionState);
  const statusPreviousStateRef = useRef(initialActionState);
  useEffect(() => {
    if (!state.message || state === previousStateRef.current) return;
    previousStateRef.current = state;
    toast(state.message, state.status === "error" ? "error" : "success");
  }, [state, toast]);
  useActionToast(statusState, statusPreviousStateRef, toast);
  return (
    <li className="rounded-xl border border-border bg-background/55 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{rule.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {rule.categoryName} ·{" "}
            {rule.cadence === "monthly" ? "Mensual" : "Semanal"}
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold">
          {formatMoney(decimalToCents(rule.amount))}
        </p>
      </div>
      <div className="mt-3 flex gap-2">
        <form action={action} className="min-w-0 flex-1">
          <input type="hidden" name="ruleId" value={rule.id} />
          <input type="hidden" name="date" value={peruDate()} />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className="relative w-full"
            disabled={pending || statusPending || !rule.active}
          >
            <span className={pending ? "invisible" : ""}>Registrar hoy</span>
            {pending && (
              <LoaderCircle className="absolute animate-spin" aria-hidden />
            )}
          </Button>
        </form>
        <form action={statusAction}>
          <input type="hidden" name="ruleId" value={rule.id} />
          <input type="hidden" name="active" value={String(!rule.active)} />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="relative"
            disabled={pending || statusPending}
          >
            <span className={statusPending ? "invisible" : ""}>
              {rule.active ? "Pausar" : "Activar"}
            </span>
            {statusPending && (
              <LoaderCircle className="absolute animate-spin" aria-hidden />
            )}
          </Button>
        </form>
      </div>
    </li>
  );
}

export function ExpenseFormModal({
  categories,
  expense,
  managingCategories = false,
  onManageCategories,
  onOpenChange,
  open,
  ruc,
}: {
  categories: ExpenseCategory[];
  expense: ExpenseRecord | null;
  managingCategories?: boolean;
  onManageCategories?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  ruc: string | null;
}) {
  const [categoryId, setCategoryId] = useState(expense?.category_id ?? "");
  const [date, setDate] = useState(
    expense ? peruDate(new Date(expense.occurred_at)) : peruDate(),
  );
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [paidWithRuc, setPaidWithRuc] = useState(
    expense?.paid_with_ruc ?? false,
  );
  const [state, action, pending] = useActionState(
    saveExpense,
    initialActionState,
  );
  const { toast } = useToast();
  const previousStateRef = useRef(initialActionState);
  useActionToast(state, previousStateRef, toast, () => onOpenChange(false));
  const activeCategories = categories.filter(
    (category) => category.active || category.id === expense?.category_id,
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={expense ? "Editar gasto" : "Registrar gasto"}
      description="Guarda el monto, la categoría y el día para tenerlo siempre a mano."
    >
      {activeCategories.length ? (
        <form action={action} className="space-y-5" aria-busy={pending}>
          <input type="hidden" name="id" value={expense?.id ?? ""} />
          <input type="hidden" name="categoryId" value={categoryId} />
          <CategoryPicker
            categories={activeCategories}
            disabled={pending}
            managingCategories={managingCategories}
            onChange={setCategoryId}
            onManageCategories={onManageCategories}
            value={categoryId}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha" htmlFor="expense-date">
              <DatePicker
                id="expense-date"
                name="date"
                value={date}
                onChange={setDate}
                disabled={pending}
              />
            </Field>
            <Field label="Monto" htmlFor="expense-amount">
              <NumericInput
                id="expense-amount"
                name="amount"
                placeholder="0.00"
                value={amount}
                onValueChange={setAmount}
                maxLength={15}
                required
                disabled={pending}
              />
            </Field>
          </div>
          <Field label="Descripción" htmlFor="expense-description">
            <Input
              id="expense-description"
              name="description"
              maxLength={120}
              defaultValue={expense?.description ?? ""}
              placeholder="Por ejemplo, estacionamiento"
              required
              disabled={pending}
            />
          </Field>
          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="paidWithRuc"
                  value="true"
                  checked={paidWithRuc}
                  onChange={(event) => setPaidWithRuc(event.target.checked)}
                  disabled={pending}
                  className="size-4 rounded border-input accent-primary"
                />
                Se pagó con RUC
              </label>
              {!ruc && (
                <Link
                  href="/app/settings"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Configúralo aquí
                </Link>
              )}
            </div>
          </div>
          <Field label="Nota (opcional)" htmlFor="expense-notes">
            <textarea
              id="expense-notes"
              name="notes"
              maxLength={500}
              defaultValue={expense?.notes ?? ""}
              disabled={pending}
              className="flex min-h-22 w-full resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Algo que quieras recordar"
            />
          </Field>
          <ModalActions
            pending={pending}
            submitLabel={expense ? "Guardar cambios" : "Guardar gasto"}
            onCancel={() => onOpenChange(false)}
            disabled={!categoryId || !amount || (paidWithRuc && !ruc)}
          />
        </form>
      ) : (
        <NoCategories
          managingCategories={managingCategories}
          onClose={() => onOpenChange(false)}
          onManageCategories={onManageCategories}
        />
      )}
    </Modal>
  );
}

export function FuelFormModal({
  onOpenChange,
  open,
  refill,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  refill: FuelRefill | null;
}) {
  const [date, setDate] = useState(
    refill ? peruDate(new Date(refill.occurred_at)) : peruDate(),
  );
  const [amount, setAmount] = useState(refill ? String(refill.amount) : "");
  const [liters, setLiters] = useState(
    refill?.liters ? String(refill.liters) : "",
  );
  const [odometerKm, setOdometerKm] = useState(
    refill?.odometer_km ? String(refill.odometer_km) : "",
  );
  const [state, action, pending] = useActionState(
    saveFuelRefill,
    initialActionState,
  );
  const { toast } = useToast();
  const previousStateRef = useRef(initialActionState);
  useActionToast(state, previousStateRef, toast, () => onOpenChange(false));
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={refill ? "Editar recarga" : "Registrar recarga"}
      description="Anota lo que cargaste para conocer mejor el costo de tu vehículo."
    >
      <form action={action} className="space-y-5" aria-busy={pending}>
        <input type="hidden" name="id" value={refill?.id ?? ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha" htmlFor="fuel-date">
            <DatePicker
              id="fuel-date"
              name="date"
              value={date}
              onChange={setDate}
              disabled={pending}
            />
          </Field>
          <Field label="Monto pagado" htmlFor="fuel-amount">
            <NumericInput
              id="fuel-amount"
              name="amount"
              value={amount}
              onValueChange={setAmount}
              placeholder="0.00"
              maxLength={15}
              required
              disabled={pending}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Litros (opcional)" htmlFor="fuel-liters">
            <NumericInput
              id="fuel-liters"
              name="liters"
              value={liters}
              onValueChange={setLiters}
              decimals={3}
              placeholder="0.000"
              maxLength={14}
              disabled={pending}
            />
          </Field>
          <Field label="Kilometraje (opcional)" htmlFor="fuel-odometer">
            <NumericInput
              id="fuel-odometer"
              name="odometerKm"
              value={odometerKm}
              onValueChange={setOdometerKm}
              decimals={1}
              placeholder="0.0"
              maxLength={15}
              disabled={pending}
            />
          </Field>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/55 px-3.5 py-3 text-sm">
          <input
            type="checkbox"
            name="fullTank"
            value="true"
            defaultChecked={refill?.full_tank ?? false}
            disabled={pending}
            className="size-4 rounded border-input accent-primary"
          />{" "}
          Llené el tanque
        </label>
        <Field label="Nota (opcional)" htmlFor="fuel-notes">
          <textarea
            id="fuel-notes"
            name="notes"
            maxLength={500}
            defaultValue={refill?.notes ?? ""}
            disabled={pending}
            className="flex min-h-22 w-full resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Estación o algún detalle útil"
          />
        </Field>
        <ModalActions
          pending={pending}
          submitLabel={refill ? "Guardar cambios" : "Guardar recarga"}
          onCancel={() => onOpenChange(false)}
          disabled={!amount}
        />
      </form>
    </Modal>
  );
}

export function CategoryModal({
  categories,
  onOpenChange,
  open,
}: {
  categories: ExpenseCategory[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [kind, setKind] = useState<ExpenseCategory["kind"]>("operational");
  const [editingCategory, setEditingCategory] =
    useState<ExpenseCategory | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [state, action, pending] = useActionState(
    saveCategory,
    initialActionState,
  );
  const { toast } = useToast();
  const previousStateRef = useRef(initialActionState);
  useActionToast(state, previousStateRef, toast, () => {
    setEditingCategory(null);
    setCategoryName("");
  });
  const fuelLikeCategory = isFuelLikeCategory(categoryName);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Categorías"
      description="Organiza tus gastos sin perder tus registros anteriores."
    >
      <div className="space-y-6">
        <form
          key={editingCategory?.id ?? "new"}
          action={action}
          className="space-y-4 rounded-2xl border border-border bg-background/50 p-4"
        >
          {editingCategory ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">Editar categoría</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Elige cómo quieres organizarla.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryName("");
                  }}
                  disabled={pending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="relative"
                  disabled={pending || fuelLikeCategory}
                >
                  <span className={pending ? "invisible" : ""}>Guardar</span>
                  {pending && (
                    <LoaderCircle
                      className="absolute animate-spin"
                      aria-hidden
                    />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Nueva categoría</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Elige cómo quieres organizarla.
                </p>
              </div>
              <Button
                type="submit"
                size="sm"
                className="relative shrink-0"
                disabled={pending || fuelLikeCategory}
              >
                <span className={pending ? "invisible" : ""}>Crear</span>
                {pending && (
                  <LoaderCircle className="absolute animate-spin" aria-hidden />
                )}
              </Button>
            </div>
          )}
          <input
            type="hidden"
            name="categoryId"
            value={editingCategory?.id ?? ""}
          />
          <input type="hidden" name="kind" value={kind} />
          <div className="flex w-full rounded-xl bg-muted p-1">
            <KindButton
              active={kind === "operational"}
              onClick={() => setKind("operational")}
            >
              Operativo
            </KindButton>
            <KindButton
              active={kind === "personal"}
              onClick={() => setKind("personal")}
            >
              Personal
            </KindButton>
          </div>
          <Input
            name="name"
            maxLength={50}
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Por ejemplo, mantenimiento"
            required
            disabled={pending}
          />
          {fuelLikeCategory && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-secondary/60 px-3.5 py-3">
              <div>
                <p className="text-xs font-semibold">
                  El combustible se registra como recarga.
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Así tendrás el importe y el kilometraje juntos.
                </p>
              </div>
              <Button asChild type="button" size="sm">
                <Link href="/app/expenses?create=fuel">Registrar recarga</Link>
              </Button>
            </div>
          )}
        </form>
        <section aria-labelledby="category-list-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 id="category-list-title" className="text-sm font-semibold">
              Tus categorías
            </h3>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
              {categories.length}
            </span>
          </div>
          {categories.length ? (
            <ul className="space-y-2.5">
              {categories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  onEdit={() => {
                    setEditingCategory(category);
                    setCategoryName(category.name);
                    setKind(category.kind);
                  }}
                />
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-background/45 px-4 py-5 text-center text-sm text-muted-foreground">
              Aún no tienes categorías.
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}

function isFuelLikeCategory(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-PE");
  return /\b(gas|gasolina|combustible|fuel|petroleo|diesel|glp)\b/.test(
    normalized,
  );
}

function CategoryItem({
  category,
  onEdit,
}: {
  category: ExpenseCategory;
  onEdit: () => void;
}) {
  const [state, action, pending] = useActionState(
    setCategoryActive,
    initialActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteCategory,
    initialActionState,
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { toast } = useToast();
  const previousStateRef = useRef(initialActionState);
  const deletePreviousStateRef = useRef(initialActionState);
  useActionToast(state, previousStateRef, toast);
  useActionToast(deleteState, deletePreviousStateRef, toast, () =>
    setConfirmingDelete(false),
  );
  return (
    <li className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="min-w-0 break-words text-sm font-semibold">
          {category.name}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] font-medium">
          <span className="rounded-full bg-secondary px-2 py-1 text-secondary-foreground">
            {category.kind === "operational" ? "Operativo" : "Personal"}
          </span>
          <span
            className={
              category.active
                ? "rounded-full bg-success/10 px-2 py-1 text-success-foreground"
                : "rounded-full bg-muted px-2 py-1 text-muted-foreground"
            }
          >
            {category.active ? "Activa" : "Pausada"}
          </span>
        </div>
      </div>
      {!confirmingDelete && (
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full px-2"
            onClick={onEdit}
            disabled={pending || deletePending}
          >
            Editar
          </Button>
          <form action={action}>
            <input type="hidden" name="categoryId" value={category.id} />
            <input
              type="hidden"
              name="active"
              value={String(!category.active)}
            />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="relative w-full px-2"
              disabled={pending || deletePending}
            >
              <span className={pending ? "invisible" : ""}>
                {category.active ? "Pausar" : "Activar"}
              </span>
              {pending && (
                <LoaderCircle className="absolute animate-spin" aria-hidden />
              )}
            </Button>
          </form>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full px-2 text-destructive hover:text-destructive"
            onClick={() => setConfirmingDelete(true)}
            disabled={pending || deletePending}
          >
            Eliminar
          </Button>
        </div>
      )}
      {confirmingDelete && (
        <div className="mt-3 rounded-xl border border-destructive/25 bg-destructive/5 p-3">
          <p className="text-xs leading-5 text-muted-foreground">
            Se eliminará sólo si no tiene gastos ni recurrencias vinculadas.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(false)}
              disabled={deletePending}
            >
              Cancelar
            </Button>
            <form action={deleteAction}>
              <input type="hidden" name="categoryId" value={category.id} />
              <Button
                type="submit"
                size="sm"
                className="relative bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deletePending}
              >
                <span className={deletePending ? "invisible" : ""}>
                  Eliminar categoría
                </span>
                {deletePending && (
                  <LoaderCircle className="absolute animate-spin" aria-hidden />
                )}
              </Button>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}

function RecurringFormModal({
  categories,
  managingCategories,
  onManageCategories,
  onOpenChange,
  open,
}: {
  categories: ExpenseCategory[];
  managingCategories: boolean;
  onManageCategories: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [cadence, setCadence] = useState<"weekly" | "monthly">("monthly");
  const [anchorDate, setAnchorDate] = useState(peruDate());
  const [amount, setAmount] = useState("");
  const [state, action, pending] = useActionState(
    saveRecurringExpense,
    initialActionState,
  );
  const { toast } = useToast();
  const previousStateRef = useRef(initialActionState);
  useActionToast(state, previousStateRef, toast, () => onOpenChange(false));
  const activeCategories = categories.filter((category) => category.active);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Gasto frecuente"
      description="Guarda uno que se repite para registrarlo más rápido cuando lo necesites."
    >
      {activeCategories.length ? (
        <form action={action} className="space-y-5" aria-busy={pending}>
          <input type="hidden" name="categoryId" value={categoryId} />
          <input type="hidden" name="cadence" value={cadence} />
          <CategoryPicker
            categories={activeCategories}
            disabled={pending}
            managingCategories={managingCategories}
            onChange={setCategoryId}
            onManageCategories={onManageCategories}
            value={categoryId}
          />
          <Field label="Descripción" htmlFor="recurring-description">
            <Input
              id="recurring-description"
              name="description"
              maxLength={120}
              placeholder="Por ejemplo, plan de datos"
              required
              disabled={pending}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Monto habitual" htmlFor="recurring-amount">
              <NumericInput
                id="recurring-amount"
                name="amount"
                value={amount}
                onValueChange={setAmount}
                placeholder="0.00"
                maxLength={15}
                required
                disabled={pending}
              />
            </Field>
            <Field label="Desde cuándo" htmlFor="recurring-date">
              <DatePicker
                id="recurring-date"
                name="anchorDate"
                value={anchorDate}
                onChange={setAnchorDate}
                disabled={pending}
              />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 block text-xs font-semibold">
              Cada cuánto ocurre
            </legend>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              <KindButton
                active={cadence === "weekly"}
                onClick={() => setCadence("weekly")}
              >
                Semanal
              </KindButton>
              <KindButton
                active={cadence === "monthly"}
                onClick={() => setCadence("monthly")}
              >
                Mensual
              </KindButton>
            </div>
          </fieldset>
          <ModalActions
            pending={pending}
            submitLabel="Guardar gasto frecuente"
            onCancel={() => onOpenChange(false)}
            disabled={!categoryId || !amount}
          />
        </form>
      ) : (
        <NoCategories
          managingCategories={managingCategories}
          onClose={() => onOpenChange(false)}
          onManageCategories={onManageCategories}
        />
      )}
    </Modal>
  );
}

function CategoryPicker({
  categories,
  disabled,
  managingCategories,
  onChange,
  onManageCategories,
  value,
}: {
  categories: ExpenseCategory[];
  disabled: boolean;
  managingCategories: boolean;
  onChange: (value: string) => void;
  onManageCategories?: () => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selected = categories.find((category) => category.id === value);
  const normalizedQuery = query.trim().toLocaleLowerCase("es-PE");
  const visibleCategories = normalizedQuery
    ? categories.filter((category) =>
        category.name.toLocaleLowerCase("es-PE").includes(normalizedQuery),
      )
    : categories;

  useEffect(() => {
    if (open && searchOpen) searchInputRef.current?.focus();
  }, [open, searchOpen]);

  const closePicker = () => {
    setOpen(false);
    setSearchOpen(false);
    setQuery("");
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span
          id="expense-category-label"
          className="block text-xs font-semibold"
        >
          Categoría
        </span>
        {onManageCategories && (
          <button
            type="button"
            className="relative text-xs font-semibold text-primary hover:underline disabled:cursor-wait disabled:opacity-70"
            onClick={onManageCategories}
            disabled={disabled || managingCategories}
          >
            <span className={managingCategories ? "invisible" : ""}>
              Gestionar categorías
            </span>
            {managingCategories && (
              <LoaderCircle
                className="absolute inset-0 m-auto animate-spin"
                size={15}
                aria-hidden
              />
            )}
            {managingCategories && (
              <span className="sr-only">Abriendo categorías</span>
            )}
          </button>
        )}
      </div>
      <button
        ref={triggerRef}
        type="button"
        aria-labelledby="expense-category-label"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => {
          if (open) closePicker();
          else {
            setOpen(true);
            setSearchOpen(true);
          }
        }}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-card px-3.5 text-left text-sm transition-all duration-200 hover:border-muted-foreground/45 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          className={selected ? "text-foreground" : "text-muted-foreground"}
        >
          {selected?.name ?? "Elige una categoría"}
        </span>
        <ChevronDown
          className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          size={18}
        />
      </button>
      {open && (
        <ModalPopover
          anchorRef={triggerRef}
          open={open}
          onOpenChange={(nextOpen) =>
            nextOpen ? setOpen(true) : closePicker()
          }
        >
          <div role="listbox" aria-labelledby="expense-category-label">
            <div className="sticky top-0 z-10 bg-card p-1">
              <div className="group flex h-10 w-full items-center gap-2 rounded-xl border border-primary/15 bg-secondary/65 px-3 transition-colors focus-within:border-primary/45 focus-within:ring-3 focus-within:ring-primary/10">
                <Search
                  size={16}
                  className="shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary"
                />
                <input
                  ref={searchInputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar categoría"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-card/70 hover:text-foreground"
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
            {visibleCategories.length ? (
              visibleCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  role="option"
                  aria-selected={category.id === value}
                  onClick={() => {
                    onChange(category.id);
                    closePicker();
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ${category.id === value ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"}`}
                >
                  <span>{category.name}</span>
                  {category.id === value && <Check size={16} />}
                </button>
              ))
            ) : (
              <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                No encontramos esa categoría.
              </p>
            )}
          </div>
        </ModalPopover>
      )}
    </div>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-xs font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}
function KindButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 flex-1 rounded-lg px-3 text-xs font-semibold transition-all duration-200 ${active ? "bg-primary text-primary-foreground shadow-[0_2px_8px_rgb(194_65_12_/_0.2)]" : "text-muted-foreground hover:bg-card/70 hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}
function ModalActions({
  disabled,
  onCancel,
  pending,
  submitLabel,
}: {
  disabled: boolean;
  onCancel: () => void;
  pending: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-3 pt-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCancel}
        disabled={pending}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        size="sm"
        className="relative"
        disabled={disabled || pending}
      >
        <span className={pending ? "invisible" : ""}>{submitLabel}</span>
        {pending && (
          <LoaderCircle className="absolute animate-spin" aria-hidden />
        )}
        {pending && <span className="sr-only">Guardando</span>}
      </Button>
    </div>
  );
}
function NoCategories({
  managingCategories,
  onClose,
  onManageCategories,
}: {
  managingCategories: boolean;
  onClose: () => void;
  onManageCategories?: () => void;
}) {
  return (
    <div>
      <p className="text-sm leading-6 text-muted-foreground">
        Crea primero una categoría activa para poder registrar este gasto.
      </p>
      <div className="mt-5 flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={managingCategories}
        >
          Cancelar
        </Button>
        {onManageCategories && (
          <Button
            type="button"
            size="sm"
            className="relative"
            onClick={onManageCategories}
            disabled={managingCategories}
          >
            <span className={managingCategories ? "invisible" : ""}>
              Gestionar categorías
            </span>
            {managingCategories && (
              <LoaderCircle className="absolute animate-spin" aria-hidden />
            )}
            {managingCategories && (
              <span className="sr-only">Abriendo categorías</span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
function useActionToast(
  state: { status: "idle" | "success" | "error"; message: string },
  previousStateRef: React.MutableRefObject<typeof initialActionState>,
  toast: ReturnType<typeof useToast>["toast"],
  onSuccess?: () => void,
) {
  useEffect(() => {
    if (!state.message || state === previousStateRef.current) return;
    previousStateRef.current = state;
    toast(state.message, state.status === "error" ? "error" : "success");
    if (state.status === "success" && onSuccess)
      window.requestAnimationFrame(onSuccess);
  }, [onSuccess, previousStateRef, state, toast]);
}

function peruDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Lima",
});
function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}
function formatDecimal(value: number, digits: number) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: digits,
  }).format(value);
}
