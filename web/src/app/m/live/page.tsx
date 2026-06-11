"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  Clock,
  LogOut,
  Timer,
  UserCheck,
  UserX,
  X
} from "lucide-react";

import { api } from "@/lib/api";
import type { ClockLiveResponse, LiveEmployee } from "@/lib/types";
import { useMobileUser } from "@/components/mobile/mobile-shell";
import {
  fmtElapsedMin,
  fmtLongDate,
  fmtTime,
  initials
} from "@/components/mobile/mobile-format";

function EmployeeSheet({
  employee,
  onClose,
  onDone
}: {
  employee: LiveEmployee;
  onClose: () => void;
  onDone: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isIn = employee.status === "CLOCKED_IN";

  async function closeSession() {
    if (!employee.work_session_id) return;
    if (!window.confirm(`¿Cerrar el turno de ${employee.full_name}? Se registrará la hora actual como salida.`)) {
      return;
    }
    setClosing(true);
    try {
      await api.createCorrection({
        work_session_id: employee.work_session_id,
        new_clock_out_at: new Date().toISOString(),
        reason: "Cierre manual por manager desde móvil"
      });
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar el turno.");
      setClosing(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--m-surface)",
          borderRadius: "20px 20px 0 0",
          padding: "24px 20px calc(28px + env(safe-area-inset-bottom, 0px))"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <span className={`m-avatar ${isIn ? "m-av-in" : "m-av-out"}`} style={{ width: 52, height: 52, fontSize: 19 }}>
            {initials(employee.full_name)}
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontSize: 18, fontWeight: 700 }}>{employee.full_name}</span>
            <span style={{ display: "block", fontSize: 13, color: "var(--m-text-2)", marginTop: 2 }}>
              {isIn ? "Trabajando ahora" : "Fuera del turno"}
            </span>
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--m-text-2)" }}>
            <X size={22} strokeWidth={2} />
          </button>
        </div>

        {isIn ? (
          <div
            style={{
              background: "var(--m-bg)",
              borderRadius: 12,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 18
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <Clock size={16} strokeWidth={2} color="#64748B" />
              <span style={{ flex: 1, color: "var(--m-text-2)" }}>Entrada</span>
              <b>{fmtTime(employee.clock_in_at)}</b>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <Timer size={16} strokeWidth={2} color="#64748B" />
              <span style={{ flex: 1, color: "var(--m-text-2)" }}>Tiempo trabajado</span>
              <b>{employee.elapsed_minutes != null ? fmtElapsedMin(employee.elapsed_minutes) : "—"}</b>
            </span>
            {(employee.flagged_reasons?.length ?? 0) > 0 ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  background: "var(--m-warning-light)",
                  borderRadius: 8,
                  padding: 8,
                  color: "var(--m-warning)",
                  fontWeight: 600
                }}
              >
                <AlertCircle size={16} strokeWidth={2} />
                {employee.flagged_reasons.join(", ")}
              </span>
            ) : null}
          </div>
        ) : null}

        {error ? <div className="m-login-err">{error}</div> : null}

        {isIn ? (
          <button
            className="m-btn"
            style={{ background: "var(--m-error)", color: "#fff", marginBottom: 10 }}
            onClick={closeSession}
            disabled={closing}
          >
            {closing ? (
              <span className="m-spinner white" style={{ width: 20, height: 20, borderWidth: 2.5 }} />
            ) : (
              <>
                <LogOut size={18} strokeWidth={2} />
                Cerrar turno manualmente
              </>
            )}
          </button>
        ) : null}
        <button className="m-btn m-btn-ghost" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default function ManagerLivePage() {
  const user = useMobileUser();
  const [data, setData] = useState<ClockLiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LiveEmployee | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.live());
      setError(null);
    } catch {
      setError("No se pudo cargar el estado en vivo.");
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30000);
    return () => clearInterval(t);
  }, [load]);

  const employees = data?.employees ?? [];
  const flags = employees.filter((e) => (e.flagged_reasons?.length ?? 0) > 0).length;
  const totalMin = employees
    .filter((e) => e.status === "CLOCKED_IN")
    .reduce((acc, e) => acc + (e.elapsed_minutes ?? 0), 0);

  return (
    <div className="m-screen">
      <header className="m-lt-header">
        <div className="row">
          <div>
            <div className="m-lt-title">{user?.restaurant_name ?? "Mi restaurante"}</div>
            <div className="m-lt-sub">{fmtLongDate(new Date())}</div>
          </div>
          {flags > 0 ? (
            <span
              className="m-pill m-pill-warn"
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 11px", marginTop: 4 }}
            >
              <AlertCircle size={13} strokeWidth={2.4} />
              {flags} alerta{flags > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
      </header>

      {!data && !error ? (
        <div className="m-center">
          <div className="m-spinner lg" />
        </div>
      ) : null}

      {error ? <div className="m-error">{error}</div> : null}

      {data ? (
        <>
          <div className="m-sumrow">
            <div className="m-sum" style={{ background: "var(--m-success-light)" }}>
              <UserCheck size={22} strokeWidth={2} color="#16A34A" />
              <span className="n">{data.summary.clocked_in}</span>
              <span className="l">Trabajando</span>
            </div>
            <div className="m-sum" style={{ background: "var(--m-divider)" }}>
              <UserX size={22} strokeWidth={2} color="#64748B" />
              <span className="n">{data.summary.off_duty}</span>
              <span className="l">Fuera</span>
            </div>
            <div className="m-sum" style={{ background: "var(--m-primary-light)" }}>
              <Clock size={22} strokeWidth={2} color="#2563EB" />
              <span className="n">
                {totalMin >= 60 ? `${Math.floor(totalMin / 60)}h` : `${totalMin}m`}
              </span>
              <span className="l">Horas hoy</span>
            </div>
          </div>

          <section className="m-sec" style={{ paddingBottom: 24 }}>
            <div className="m-sec-h">
              <span className="m-sec-t">Equipo ahora</span>
              <span className="m-sec-hint">Toca para ver opciones</span>
            </div>
            {employees.length === 0 ? (
              <div className="m-card m-empty">
                <b>No hay empleados registrados aún.</b>
              </div>
            ) : (
              <div className="m-card m-list">
                {employees.map((emp) => {
                  const isIn = emp.status === "CLOCKED_IN";
                  const flagged = (emp.flagged_reasons?.length ?? 0) > 0;
                  return (
                    <button
                      key={emp.employee_id}
                      className={`m-lrow${flagged ? " flagged" : ""}`}
                      onClick={() => setSelected(emp)}
                    >
                      <span className={`m-avatar ${isIn ? "m-av-in" : "m-av-out"}`}>
                        {initials(emp.full_name)}
                      </span>
                      <span className="m-lbody">
                        <span className="m-lname">
                          {emp.full_name}
                          {flagged ? <AlertCircle size={14} strokeWidth={2.4} color="#D97706" /> : null}
                        </span>
                        <span className="m-lsub" style={{ display: "block" }}>
                          {isIn
                            ? `Entró a las ${fmtTime(emp.clock_in_at)}${
                                emp.elapsed_minutes != null ? ` · ${fmtElapsedMin(emp.elapsed_minutes)}` : ""
                              }`
                            : "Fuera del turno"}
                        </span>
                        {flagged ? (
                          <span className="m-lflag" style={{ display: "block" }}>
                            ⚠ {emp.flagged_reasons.join(", ")}
                          </span>
                        ) : null}
                      </span>
                      <span className="m-lright">
                        <span className={`m-pill ${isIn ? "m-pill-in" : "m-pill-out"}`}>
                          {isIn ? "Dentro" : "Fuera"}
                        </span>
                        <ChevronRight size={16} strokeWidth={2.2} color="#94A3B8" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}

      {selected ? (
        <EmployeeSheet
          employee={selected}
          onClose={() => setSelected(null)}
          onDone={() => void load()}
        />
      ) : null}
    </div>
  );
}
