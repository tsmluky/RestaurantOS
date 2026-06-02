"use client";

import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { formatTime, monthStartISODate, todayISODate } from "@/lib/format";
import type { WorkSession } from "@/lib/types";

const days = Array.from({ length: 31 }, (_, index) => index + 1);

export default function CalendarPage() {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .workSessions(monthStartISODate(), todayISODate())
      .then(setSessions)
      .catch((err) => setError(err instanceof Error ? err.message : "Error cargando calendario"));
  }, []);

  const sessionsByDay = useMemo(() => {
    const map = new Map<number, WorkSession[]>();
    for (const session of sessions) {
      const day = new Date(session.clock_in_at).getDate();
      map.set(day, [...(map.get(day) ?? []), session]);
    }
    return map;
  }, [sessions]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario"
        description="Vista mensual de registros. No planifica turnos todavía; enseña lo trabajado."
      />
      {error ? <div className="rounded-lg bg-danger-soft p-4 text-sm text-danger">{error}</div> : null}
      <SectionCard title="Mes actual" description="Bloques por sesión registrada">
        <div className="grid grid-cols-2 gap-px bg-border p-px sm:grid-cols-4 lg:grid-cols-7">
          {days.map((day) => {
            const daySessions = sessionsByDay.get(day) ?? [];
            return (
              <div key={day} className="min-h-32 bg-white p-3">
                <div className="text-xs font-semibold text-muted">{day}</div>
                <div className="mt-2 space-y-2">
                  {daySessions.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      className="rounded-md border-l-4 border-success bg-success-soft px-2 py-1"
                    >
                      <div className="text-xs font-semibold text-success">
                        {formatTime(session.clock_in_at)} - {formatTime(session.clock_out_at)}
                      </div>
                      <div className="mt-1">
                        <StatusBadge status={session.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
