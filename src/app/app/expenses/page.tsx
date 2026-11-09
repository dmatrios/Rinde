import { ExpensesWorkspace } from "@/features/expenses/expenses-workspace";
import { getExpensesWorkspace } from "@/features/expenses/queries";

export const metadata = { title: "Gastos y combustible" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    create?: string;
    manage?: string;
    edit?: string;
    editFuel?: string;
  }>;
}) {
  const params = await searchParams;
  const workspace = await getExpensesWorkspace(params.edit, params.editFuel);
  const quickAction =
    params.create === "expense" || params.create === "fuel"
      ? params.create
      : undefined;
  const manageCategories = params.manage === "categories";
  return (
    <ExpensesWorkspace
      key={`${quickAction ?? "default"}-${manageCategories ? "categories" : "workspace"}-${params.edit ?? ""}-${params.editFuel ?? ""}`}
      {...workspace}
      quickAction={quickAction}
      manageCategories={manageCategories}
      editExpenseId={params.edit}
      editFuelId={params.editFuel}
    />
  );
}
