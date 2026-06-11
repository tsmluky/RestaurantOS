"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

import { api } from "@/lib/api";
import type { Shift } from "@/lib/types";
import {
  fmtTimeRange,
  monthShort,
  weekdayShort
} from "@/components/mobile/mobile-format";

export default function EmployeeShiftsPage() {
  const [shifts, setShifts] = useState<Shift[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .myUpcomingShifts(20)
      .then((r) => setShifts(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar turnos."));
  }, []);

  return (
    <div className="m-screen">
      <header className="m-lt-header">
        <div className="row">
          <div>
            <div className="m-lt-title">Mis turnos</div>
            <div className="m-lt-sub">
              {shifts ? `${shifts.length} turno${shifts.length === 1 ? "" : "s"} próximos` : "Cargando…"}
            </div>
          </div>
        </div>
      </header>

      {error ? <div className="m-error">{error}</div> : null}

      <section className="m-sec" style={{ paddingBottom: 24 }}>
        {!shifts ? (
          <div className="m-center">
            <div className="m-spinner" />
          </div>
        ) : shifts.length === 0 ? (
          <div className="m-card m-empty">
            <CalendarDays size={30} strokeWidth={1.5} color="#94A3B8" />
            <b>Sin turnos publicados</b>
            <span>Cuando tu manager publique el horario, lo verás aquí.</span>
          </div>
        ) : (
          <div className="m-card m-list">
            {shifts.map((s) => {
              const start = new Date(s.starts_at);
              return (
                <div className="m-lrow" key={s.id}>
                  <span
                    className="m-avatar m-av-blue"
                    style={{ borderRadius: 12, flexDirection: "column", lineHeight: 1 }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 800 }}>
                      {weekdayShort(start).toUpperCase()}
                    </span>
                    <span style={{ fontSize: 17, fontWeight: 800 }}>{start.getDate()}</span>
                    <span style={{ fontSize: 8, fontWeight: 800 }}>
                      {monthShort(start).toUpperCase()}
                    </span>
                  </span>
                  <span className="m-lbody">
                    <span className="m-lname">{fmtTimeRange(s.starts_at, s.ends_at)}</span>
                    <span className="m-lsub" style={{ display: "block" }}>
                      {s.restaurant_name ?? "—"}
                      {s.role ? ` · ${s.role}` : ""}
                    </span>
                  </span>
                  <span className="m-lright">
                    <span className="m-pill m-pill-blue">
                      {Math.round((s.duration_minutes / 60) * 10) / 10}h
                    </span>
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
