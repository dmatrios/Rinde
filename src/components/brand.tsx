import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5"
      aria-label="Rinde, inicio"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white">
        <ArrowUpRight size={24} strokeWidth={2.8} />
      </span>
      <span className="text-[27px] font-bold tracking-[-1.2px]">
        rinde<span className="text-primary">.</span>
      </span>
    </Link>
  );
}
