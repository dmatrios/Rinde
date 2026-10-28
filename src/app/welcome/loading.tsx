export default function WelcomeLoading() {
  return (
    <main
      id="main-content"
      role="status"
      aria-busy="true"
      className="mx-auto min-h-dvh max-w-2xl px-5 py-8 sm:px-8 sm:py-12"
    >
      <span className="sr-only">Cargando tu bienvenida…</span>
      <div className="h-10 w-28 animate-pulse rounded-xl bg-muted" />
      <section className="mt-12 animate-in fade-in slide-in-from-bottom-1 rounded-[1.75rem] border border-border bg-card p-6 shadow-sm duration-300 delay-75 sm:p-9">
        <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
        <div className="mt-4 h-10 w-60 max-w-full animate-pulse rounded-xl bg-muted" />
        <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-muted" />
        <div className="mt-2 h-4 w-4/5 animate-pulse rounded-full bg-muted" />
        <div className="mt-9 flex gap-3">
          <div className="h-7 flex-1 animate-pulse rounded-full bg-muted" />
          <div className="h-7 flex-1 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="h-14 animate-pulse rounded-xl bg-muted" />
          <div className="h-14 animate-pulse rounded-xl bg-muted" />
          <div className="h-14 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="mt-6 h-12 animate-pulse rounded-xl bg-muted" />
      </section>
    </main>
  );
}
