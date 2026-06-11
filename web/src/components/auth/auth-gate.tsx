"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { api, clearTokens, getAccessToken } from "@/lib/api";
import type { CurrentUser } from "@/lib/types";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<"checking" | "ready" | "anonymous">("checking");

  const isMobileRoute = pathname === "/m" || pathname.startsWith("/m/");

  useEffect(() => {
    if (pathname === "/login" || isMobileRoute) {
      setStatus("ready");
      return;
    }

    if (!getAccessToken()) {
      setStatus("anonymous");
      router.replace("/login");
      return;
    }

    api
      .me()
      .then((currentUser) => {
        setUser(currentUser);
        setStatus("ready");
      })
      .catch(() => {
        clearTokens();
        setStatus("anonymous");
        router.replace("/login");
      });
  }, [pathname, router, isMobileRoute]);

  if (pathname === "/login" || isMobileRoute) {
    return <>{children}</>;
  }

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-6">
        <div className="rounded-lg border border-border bg-surface px-5 py-4 text-sm text-muted shadow-panel">
          Cargando RestaurantOS...
        </div>
      </div>
    );
  }

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

const UserContext = {
  Provider({ children }: { value: CurrentUser | null; children: React.ReactNode }) {
    return <>{children}</>;
  }
};
