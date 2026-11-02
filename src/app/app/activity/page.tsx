import { ShiftWorkspace } from "@/features/shifts/shift-workspace";
import { getShiftWorkspace } from "@/features/shifts/queries";
import { getMovements } from "@/features/movements/queries";
import { MovementsPanel } from "@/features/movements/movements-panel";

export const metadata = { title: "Jornadas" };

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const [workspace, movements] = await Promise.all([
    getShiftWorkspace(),
    getMovements(),
  ]);
  const params = await searchParams;
  return (
    <>
      <p className="mb-2 text-xs text-muted-foreground">Tu tiempo de trabajo</p>
      <h1 className="mb-7 text-3xl font-bold tracking-tight">Jornadas</h1>
      <ShiftWorkspace
        key={params.create === "shift" ? "create" : "default"}
        {...workspace}
        openStartOnLoad={params.create === "shift"}
      />
      <MovementsPanel movements={movements} />
    </>
  );
}
