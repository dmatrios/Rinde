export default function SectionLoading() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">Cargando tu información…</span>
      <header className="animate-in fade-in slide-in-from-bottom-1 space-y-3 duration-300">
        <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
        <div className="h-9 w-48 animate-pulse rounded-xl bg-muted" />
      </header>
      <div className="animate-in fade-in slide-in-from-bottom-1 grid gap-5 duration-300 delay-75 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="h-44 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
