"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, FileDown } from "lucide-react";

import { api, getAccessToken } from "@/lib/api";
import type { Employee, WorkSession } from "@/lib/types";
import {
  fmtDayMonth,
  fmtElapsedMin,
  fmtTime,
  initials
} from "@/components/mobile/mobile-format";

type Range = "today" | "week" | "month";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeDates(range: Range): { from: string; to: string } {
  const now = new Date();
  const to = isoDate(now);
  if (range === "today") return { from: to, to };
  if (range === "week") {
    const monday = new Date(now);
    const day = (now.getDay() + 6) % 7;
    monday.setDate(now.getDate() - day);
    return { from: isoDate(monday), to };
  }
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: isoDate(first), to };
}

export default function ManagerSessionsPage() {
  const [range, setRange] = useState<Range>("today");
  const [sessions, setSessions] = useState<WorkSession[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const nameByProfile = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of employees) {
      map.set(e.profile_id, e.full_name);
    }
    return map;
  }, [employees]);

  const load = useCallback(async (r: Range) => {
    setSessions(null);
    setError(null);
    const { from, to } = rangeDates(r);
    try {
      const [s, emps] = await Promise.all([
        api.workSessions(from, to),
        api.employees()
      ]);
      setSessions(s);
      setEmployees(emps);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando fichajes.");
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [range, load]);

  async function handleExport() {
    const token = getAccessToken();
    if (!token) return;
    setExporting(true);
    try {
      const { from, to } = rangeDates(range);
      const res = await fetch(api.exportUrl(from, to, "CSV"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("No se pudo generar el export.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fichajes_${from}_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al exportar.");
    } finally {
      setExporting(false);
    }
  }

  const sorted = (sessions ?? [])
    .slice()
    .sort((a, b) => new Date(b.clock_in_at).getTime() - new Date(a.clock_in_at).getTime());

  return (
    <div className="m-screen">
      <header className="m-lt-header">
        <div className="row">
          <div>
            <div className="m-lt-title">Fichajes</div>
            <div className="m-lt-sub">
              {sessions ? `${sessions.length} registro${sessions.length === 1 ? "" : "s"}` : "Cargando…"}
            </div>
          </div>
        </div>
      </header>

      <div className="m-seg">
        {(
          [
            ["today", "Hoy"],
            ["week", "Semana"],
            ["month", "Mes"]
          ] as [Range, string][]
        ).map(([key, label]) => (
          <button key={key} className={range === key ? "on" : ""} onClick={() => setRange(key)}>
            {label}
          </button>
        ))}
      </div>

      {error ? <div className="m-error">{error}</div> : null}

      <section className="m-sec" style={{ paddingBottom: 8 }}>
        {!sessions ? (
          <div className="m-center">
            <div className="m-spinner" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="m-card m-empty">
            <ClipboardList size={30} strokeWidth={1.5} color="#94A3B8" />
            <b>Sin fichajes en este periodo</b>
          </div>
        ) : (
          <div className="m-card m-list">
            {sorted.map((ws) => {
              const name = nameByProfile.get(ws.user_id) ?? "Empleado";
              const open = !ws.clock_out_at;
              const flagged = (ws.flagged_reasons?.length ?? 0) > 0;
              return (
                <div className="m-lrow" key={ws.id}>
                  <span className="m-avatar m-av-blue">{initials(name)}</span>
                  <span className="m-lbody">
                    <span className="m-lname">{name}</span>
                    <span className="m-lsub" style={{ display: "block", textTransform: "capitalize" }}>
                      {fmtDayMonth(new Date(ws.clock_in_at))} · {fmtTime(ws.clock_in_at)} →{" "}
                      {open ? "en curso" : fmtTime(ws.clock_out_at)}
                      {ws.duration_minutes != null ? ` · ${fmtElapsedMin(ws.duration_minutes)}` : ""}
                    </span>
                    {ws.was_corrected ? (
                      <span className="m-lsub" style={{ display: "block", color: "var(--m-text-3)" }}>
                        Editado por manager
                      </span>
                    ) : null}
                  </span>
                  <span className="m-lright">
                    {open ? (
                      <span className="m-pill m-pill-in">Abierto</span>
                    ) : flagged ? (
                      <span className="m-pill m-pill-warn">⚠ Revisar</span>
                    ) : ws.was_corrected ? (
                      <span className="m-pill m-pill-out">Editado</span>
                    ) : (
                      <span className="m-pill m-pill-blue">OK</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="m-screen-foot">
        <button className="m-btn m-btn-primary" onClick={handleExport} disabled={exporting || !sessions}>
          {exporting ? (
            <span className="m-spinner white" style={{ width: 20, height: 20, borderWidth: 2.5 }} />
          ) : (
            <>
              <FileDown size={19} strokeWidth={2.2} />
              Exportar para gestoría
            </>
          )}
        </button>
      </div>
    </div>
  );
}
