export default function MovementDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6 pb-10" aria-label="Cargando movimiento">
      <div className="h-8 w-36 rounded-xl bg-muted" />
      <div className="h-40 rounded-3xl bg-muted" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
        <div className="h-72 rounded-2xl bg-muted" />
        <div className="h-56 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
