export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="max-w-7xl space-y-6">
      <span className="sr-only">Cargando tu espacio…</span>
      <header className="animate-in fade-in slide-in-from-bottom-1 space-y-3 duration-300">
        <div className="h-3 w-36 animate-pulse rounded-full bg-muted" />
        <div className="h-9 w-52 animate-pulse rounded-xl bg-muted" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded-full bg-muted" />
      </header>
      <div className="animate-in fade-in slide-in-from-bottom-1 grid gap-3 duration-300 delay-75 sm:grid-cols-3">
        <div className="h-20 animate-pulse rounded-2xl bg-muted" />
        <div className="h-20 animate-pulse rounded-2xl bg-muted" />
        <div className="h-20 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="animate-in fade-in slide-in-from-bottom-1 grid gap-5 duration-300 delay-150 xl:grid-cols-[minmax(280px,0.82fr)_minmax(420px,1.18fr)_310px]">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
