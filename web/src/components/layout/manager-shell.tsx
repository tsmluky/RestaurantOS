"use client";

import clsx from "clsx";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Download,
  Edit3,
  LayoutDashboard,
  LogOut,
  Settings,
  TabletSmartphone,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { clearTokens } from "@/lib/api";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/horario", label: "Horario", icon: CalendarClock },
  { href: "/fichajes", label: "Fichajes", icon: ClipboardList },
  { href: "/empleados", label: "Empleados", icon: UsersRound },
  { href: "/correcciones", label: "Correcciones", icon: Edit3 },
  { href: "/incidencias", label: "Incidencias", icon: AlertTriangle },
  { href: "/exports", label: "Exportar", icon: Download },
  { href: "/kiosk", label: "Kiosk", icon: TabletSmartphone },
  { href: "/config", label: "Config", icon: Settings }
];

export function ManagerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearTokens();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-navy text-white lg:block">
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <div>
            <div className="text-base font-semibold tracking-wide">RestaurantOS</div>
            <div className="text-xs text-white/60">by Studio32</div>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                  active ? "bg-white text-navy" : "text-white/72 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div>
              <div className="text-sm font-semibold lg:hidden">RestaurantOS</div>
              <div className="text-xs text-muted">Panel operativo</div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium text-ink shadow-sm hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
          <nav className="flex gap-2 overflow-x-auto border-t border-border px-3 py-2 lg:hidden">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium",
                    active ? "bg-primary text-white" : "text-muted"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
