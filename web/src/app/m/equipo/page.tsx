"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Search, Users } from "lucide-react";

import { api } from "@/lib/api";
import type { Employee } from "@/lib/types";
import { initials } from "@/components/mobile/mobile-format";

const ROLE_PILL: Record<string, string> = {
  EMPLOYEE: "m-pill-blue",
  MANAGER: "m-pill-warn",
  OWNER: "m-pill-warn",
  SUPERVISOR: "m-pill-in"
};

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: "Empleado",
  MANAGER: "Manager",
  OWNER: "Owner",
  SUPERVISOR: "Supervisor"
};

export default function ManagerTeamPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api
      .employees()
      .then(setEmployees)
      .catch((e) => setError(e instanceof Error ? e.message : "Error cargando equipo."));
  }, []);

  const filtered = useMemo(() => {
    if (!employees) return [];
    const q = query.trim().toLowerCase();
    const active = employees.filter((e) => e.status !== "TERMINATED");
    if (!q) return active;
    return active.filter((e) => e.full_name.toLowerCase().includes(q));
  }, [employees, query]);

  return (
    <div className="m-screen">
      <header className="m-lt-header">
        <div className="row">
          <div>
            <div className="m-lt-title">Equipo</div>
            <div className="m-lt-sub">
              {employees ? `${filtered.length} empleado${filtered.length === 1 ? "" : "s"}` : "Cargando…"}
            </div>
          </div>
        </div>
      </header>

      <div className="m-search">
        <Search size={17} strokeWidth={2.2} />
        <input
          placeholder="Buscar empleado…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error ? <div className="m-error">{error}</div> : null}

      <section className="m-sec" style={{ paddingBottom: 24 }}>
        {!employees ? (
          <div className="m-center">
            <div className="m-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="m-card m-empty">
            <Users size={30} strokeWidth={1.5} color="#94A3B8" />
            <b>{query ? "Sin resultados" : "Sin empleados todavía"}</b>
            <span>
              {query
                ? "Prueba con otro nombre."
                : "Da de alta a tu equipo desde el panel de escritorio."}
            </span>
          </div>
        ) : (
          <div className="m-card m-list">
            {filtered.map((emp) => {
              const inactive = emp.status !== "ACTIVE";
              return (
                <div className="m-lrow" key={emp.id}>
                  <span
                    className={`m-avatar ${inactive ? "m-av-out" : "m-av-blue"}`}
                    style={inactive ? { border: "1.5px dashed var(--m-text-3)", background: "transparent" } : undefined}
                  >
                    {initials(emp.full_name)}
                  </span>
                  <span className="m-lbody">
                    <span className="m-lname" style={inactive ? { color: "var(--m-text-2)" } : undefined}>
                      {emp.full_name}
                    </span>
                    <span className="m-lsub" style={{ display: "block" }}>
                      {inactive
                        ? "Inactivo"
                        : emp.email ?? emp.phone ?? "Sin contacto"}
                    </span>
                  </span>
                  <span className="m-lright">
                    <span className={`m-pill ${inactive ? "m-pill-out" : ROLE_PILL[emp.role] ?? "m-pill-blue"}`}>
                      {inactive ? "Inactivo" : ROLE_LABEL[emp.role] ?? emp.role}
                    </span>
                    <ChevronRight size={16} strokeWidth={2.2} color="#94A3B8" />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Link href="/empleados" className="m-fab" aria-label="Añadir empleado">
        <Plus size={26} strokeWidth={2.4} />
      </Link>
    </div>
  );
}
