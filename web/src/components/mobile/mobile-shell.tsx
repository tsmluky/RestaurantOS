"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  Clock,
  Home,
  LayoutDashboard,
  User,
  Users
} from "lucide-react";

import { api, clearTokens, getAccessToken } from "@/lib/api";
import type { CurrentUser } from "@/lib/types";

const MobileUserContext = createContext<CurrentUser | null>(null);

export function useMobileUser() {
  return useContext(MobileUserContext);
}

export function isManagerRole(role?: string) {
  return role === "OWNER" || role === "MANAGER" || role === "SUPERVISOR" || role === "SUPERADMIN";
}

const EMPLOYEE_TABS = [
  { href: "/m/inicio", label: "Inicio", Icon: Home },
  { href: "/m/turnos", label: "Turnos", Icon: CalendarDays },
  { href: "/m/registros", label: "Registros", Icon: Clock },
  { href: "/m/perfil", label: "Perfil", Icon: User }
];

const MANAGER_TABS = [
  { href: "/m/live", label: "En vivo", Icon: LayoutDashboard },
  { href: "/m/fichajes", label: "Fichajes", Icon: ClipboardList },
  { href: "/m/equipo", label: "Equipo", Icon: Users },
  { href: "/m/perfil", label: "Perfil", Icon: User }
];

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<"checking" | "ready">("checking");

  const isLogin = pathname === "/m/login";

  useEffect(() => {
    if (isLogin) {
      setStatus("ready");
      return;
    }
    if (!getAccessToken()) {
      router.replace("/m/login");
      return;
    }
    api
      .me()
      .then((u) => {
        setUser(u);
        setStatus("ready");
        if (pathname === "/m") {
          router.replace(isManagerRole(u.role) ? "/m/live" : "/m/inicio");
        }
      })
      .catch(() => {
        clearTokens();
        router.replace("/m/login");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isLogin]);

  if (isLogin) {
    return <div className="m-root">{children}</div>;
  }

  if (status !== "ready" || (pathname === "/m" && user)) {
    return (
      <div className="m-root">
        <div className="m-screen no-tabs">
          <div className="m-center">
            <div className="m-spinner lg" />
          </div>
        </div>
      </div>
    );
  }

  const tabs = isManagerRole(user?.role) ? MANAGER_TABS : EMPLOYEE_TABS;

  return (
    <MobileUserContext.Provider value={user}>
      <div className="m-root">
        {children}
        <nav className="m-tabbar">
          {tabs.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`m-tab${pathname === href ? " active" : ""}`}
            >
              <Icon size={22} strokeWidth={2} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </MobileUserContext.Provider>
  );
}
