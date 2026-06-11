"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  HelpCircle,
  LogOut,
  Mail,
  MonitorSmartphone,
  Store
} from "lucide-react";

import { clearTokens } from "@/lib/api";
import { initials } from "@/components/mobile/mobile-format";
import {
  isManagerRole,
  useMobileUser
} from "@/components/mobile/mobile-shell";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Propietario",
  MANAGER: "Manager",
  SUPERVISOR: "Supervisor",
  EMPLOYEE: "Empleado",
  SUPERADMIN: "Superadmin"
};

export default function MobileProfilePage() {
  const user = useMobileUser();
  const router = useRouter();
  const manager = isManagerRole(user?.role);

  function handleLogout() {
    clearTokens();
    router.replace("/m/login");
  }

  return (
    <div className="m-screen">
      <header className="m-lt-header">
        <div className="row">
          <div className="m-lt-title">Perfil</div>
        </div>
      </header>

      <div className="m-prof-head">
        <div className="m-prof-av">{initials(user?.full_name ?? "—")}</div>
        <div className="m-prof-name">{user?.full_name ?? "—"}</div>
        <div className="m-prof-role">
          {ROLE_LABEL[user?.role ?? ""] ?? user?.role ?? "—"}
          {user?.restaurant_name ? ` · ${user.restaurant_name}` : ""}
        </div>
      </div>

      <section className="m-sec">
        <div className="m-card m-list">
          <div className="m-setrow">
            <span className="m-ic sm" style={{ background: "var(--m-primary-light)" }}>
              <Store size={19} strokeWidth={2} color="#2563EB" />
            </span>
            <span className="lbl">Restaurante</span>
            <span className="val">{user?.restaurant_name ?? "—"}</span>
          </div>
          <div className="m-setrow">
            <span className="m-ic sm" style={{ background: "var(--m-success-light)" }}>
              <Mail size={19} strokeWidth={2} color="#16A34A" />
            </span>
            <span className="lbl">Email</span>
            <span className="val">{user?.email ?? "—"}</span>
          </div>
          {manager ? (
            <>
              <Link href="/dashboard" className="m-setrow">
                <span className="m-ic sm" style={{ background: "var(--m-primary-light)" }}>
                  <MonitorSmartphone size={19} strokeWidth={2} color="#2563EB" />
                </span>
                <span className="lbl">Panel completo (escritorio)</span>
                <ChevronRight size={16} strokeWidth={2.2} color="#94A3B8" />
              </Link>
              <Link href="/kiosk-mode" className="m-setrow">
                <span className="m-ic sm" style={{ background: "var(--m-warning-light)" }}>
                  <MonitorSmartphone size={19} strokeWidth={2} color="#D97706" />
                </span>
                <span className="lbl">Modo kiosk</span>
                <ChevronRight size={16} strokeWidth={2.2} color="#94A3B8" />
              </Link>
            </>
          ) : null}
          <a href="mailto:soporte@studio32.dev" className="m-setrow">
            <span className="m-ic sm" style={{ background: "var(--m-divider)" }}>
              <HelpCircle size={19} strokeWidth={2} color="#64748B" />
            </span>
            <span className="lbl">Ayuda y soporte</span>
            <ChevronRight size={16} strokeWidth={2.2} color="#94A3B8" />
          </a>
        </div>
      </section>

      <section className="m-sec">
        <div className="m-card m-list">
          <button className="m-setrow danger" onClick={handleLogout}>
            <span className="m-ic sm" style={{ background: "var(--m-error-light)" }}>
              <LogOut size={19} strokeWidth={2} color="#DC2626" />
            </span>
            <span className="lbl">Cerrar sesión</span>
          </button>
        </div>
      </section>

      <div className="m-ver">RestaurantOS · Studio32</div>
    </div>
  );
}
