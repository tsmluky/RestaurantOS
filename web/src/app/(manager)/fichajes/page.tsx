"use client";

import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { formatDateTime, formatDuration, todayISODate } from "@/lib/format";
import type { WorkSession } from "@/lib/types";

export default function WorkSessionsPage() {
  const [dateFrom, setDateFrom] = useState(todayISODate());
  const [dateTo, setDateTo] = useState(todayISODate());
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      setSessions(await api.workSessions(dateFrom, dateTo));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando fichajes");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Fichajes</h1>
          <p className="mt-1 text-sm text-muted">Sesiones registradas por rango.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="h-10 rounded-md border border-border px-3 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="h-10 rounded-md border border-border px-3 text-sm"
          />
          <button
            type="button"
            onClick={load}
            className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white"
          >
            Filtrar
          </button>
        </div>
      </div>

      {error ? <div className="rounded-lg bg-danger-soft p-4 text-sm text-danger">{error}</div> : null}

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Entrada</th>
              <th className="px-4 py-3">Salida</th>
              <th className="px-4 py-3">Duración</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3">Sesión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sessions.map((session) => (
              <tr key={session.id}>
                <td className="px-4 py-4 text-ink">{formatDateTime(session.clock_in_at)}</td>
                <td className="px-4 py-4 text-muted">{formatDateTime(session.clock_out_at)}</td>
                <td className="px-4 py-4 text-muted">{formatDuration(session.duration_minutes)}</td>
                <td className="px-4 py-4">
                  <StatusBadge status={session.status} />
                </td>
                <td className="px-4 py-4 text-muted">{session.flagged_reasons?.join(", ") || "-"}</td>
                <td className="px-4 py-4 font-mono text-xs text-muted">{session.id.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted">No hay fichajes en este rango.</div>
        ) : null}
      </div>
    </div>
  );
}
