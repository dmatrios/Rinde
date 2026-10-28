"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock3,
  Wallet,
  Fuel,
  ChartNoAxesCombined,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const navigation: {
  path: string;
  label: string;
  short: string;
  icon: LucideIcon;
  mobile?: boolean;
}[] = [
  {
    path: "",
    label: "Mi resumen",
    short: "Hoy",
    icon: LayoutDashboard,
    mobile: true,
  },
  {
    path: "/activity",
    label: "Jornadas",
    short: "Actividad",
    icon: Clock3,
    mobile: true,
  },
  { path: "/earnings", label: "Ingresos", short: "Ingresos", icon: Wallet },
  {
    path: "/expenses",
    label: "Gastos y gasolina",
    short: "Gastos",
    icon: Fuel,
  },
  {
    path: "/reports",
    label: "Reportes",
    short: "Reportes",
    icon: ChartNoAxesCombined,
    mobile: true,
  },
  {
    path: "/settings",
    label: "Configuración",
    short: "Ajustes",
    icon: Settings2,
    mobile: true,
  },
];
export function Navigation({
  preview = false,
  mobile = false,
}: {
  preview?: boolean;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const base = preview ? "/preview" : "/app";
  return (
    <nav
      aria-label={mobile ? "Navegación móvil" : "Navegación principal"}
      className={mobile ? "grid grid-cols-4" : "space-y-1.5"}
    >
      {navigation
        .filter((item) => !mobile || item.mobile)
        .map(({ path, label, short, icon: Icon }) => {
          const active = pathname === base + path;
          return (
            <Link
              key={path}
              href={base + path}
              data-tour={path === "/settings" ? "settings" : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-h-12 transition-colors",
                mobile
                  ? "flex-col items-center justify-center gap-1 rounded-lg py-1 text-[11px]"
                  : "items-center gap-3 rounded-xl px-3.5 text-[13px] font-medium",
                active
                  ? mobile
                    ? "text-primary"
                    : "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon size={mobile ? 21 : 19} strokeWidth={active ? 2.2 : 1.7} />
              <span>{mobile ? short : label}</span>
              {active && !mobile && (
                <span className="ml-auto size-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
    </nav>
  );
}
