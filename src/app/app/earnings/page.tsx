import { EarningsWorkspace } from "@/features/earnings/earnings-workspace";
import { getEarningsWorkspace } from "@/features/earnings/queries";

export const metadata = { title: "Ingresos" };

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const workspace = await getEarningsWorkspace();
  const params = await searchParams;
  return <EarningsWorkspace key={params.create === "earning" ? "create" : "default"} {...workspace} openOnLoad={params.create === "earning"} />;
}
