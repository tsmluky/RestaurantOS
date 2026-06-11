"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

import { api } from "@/lib/api";
import type { WorkSession } from "@/lib/types";
import {
  fmtDayMonth,
  fmtElapsedMin,
  fmtTime
} from "@/components/mobile/mobile-format";

export default function EmployeeHistoryPage() {
  const [sessions, setSessions] = useState<WorkSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .myHistory()
      .then((r) => setSessions(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar registros."));
  }, []);

  return (
    <div className="m-screen">
      <header className="m-lt-header">
        <div className="row">
          <div>
            <div className="m-lt-title">Mis registros</div>
            <div className="m-lt-sub">Historial de fichajes</div>
          </div>
        </div>
      </header>

      {error ? <div className="m-error">{error}</div> : null}

      <section className="m-sec" style={{ paddingBottom: 24 }}>
        {!sessions ? (
          <div className="m-center">
            <div className="m-spinner" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="m-card m-empty">
            <Clock size={30} strokeWidth={1.5} color="#94A3B8" />
            <b>Sin fichajes todavía</b>
            <span>Tus entradas y salidas aparecerán aquí.</span>
          </div>
        ) : (
          <div className="m-card m-list">
            {sessions.map((ws) => {
              const open = !ws.clock_out_at;
              const flagged = (ws.flagged_reasons?.length ?? 0) > 0;
              const corrected = ws.was_corrected;
              return (
                <div className="m-lrow" key={ws.id}>
                  <span className={`m-avatar ${open ? "m-av-in" : "m-av-blue"}`}>
                    <Clock size={19} strokeWidth={2} />
                  </span>
                  <span className="m-lbody">
                    <span className="m-lname" style={{ textTransform: "capitalize" }}>
                      {fmtDayMonth(new Date(ws.clock_in_at))}
                    </span>
                    <span className="m-lsub" style={{ display: "block" }}>
                      {fmtTime(ws.clock_in_at)} → {open ? "en curso" : fmtTime(ws.clock_out_at)}
                      {ws.duration_minutes != null
                        ? ` · ${fmtElapsedMin(ws.duration_minutes)}`
                        : ""}
                    </span>
                    {flagged ? (
                      <span className="m-lflag" style={{ display: "block" }}>
                        ⚠ {ws.flagged_reasons!.join(", ")}
                      </span>
                    ) : null}
                  </span>
                  <span className="m-lright">
                    {open ? (
                      <span className="m-pill m-pill-in">Abierto</span>
                    ) : corrected ? (
                      <span className="m-pill m-pill-out">Editado</span>
                    ) : flagged ? (
                      <span className="m-pill m-pill-warn">Revisar</span>
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
    </div>
  );
}
