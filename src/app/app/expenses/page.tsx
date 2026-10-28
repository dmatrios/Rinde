import { ExpensesWorkspace } from "@/features/expenses/expenses-workspace";
import { getExpensesWorkspace } from "@/features/expenses/queries";

export const metadata = { title: "Gastos y combustible" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string; manage?: string }>;
}) {
  const workspace = await getExpensesWorkspace();
  const params = await searchParams;
  const quickAction =
    params.create === "expense" || params.create === "fuel"
      ? params.create
      : undefined;
  const manageCategories = params.manage === "categories";
  return <ExpensesWorkspace key={`${quickAction ?? "default"}-${manageCategories ? "categories" : "workspace"}`} {...workspace} quickAction={quickAction} manageCategories={manageCategories} />;
}
