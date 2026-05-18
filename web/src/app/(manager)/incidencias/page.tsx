"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import type { Incident } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  FORGOT_CLOCK_OUT: "Olvidó fichar salida",
  FORGOT_CLOCK_IN: "Olvidó fichar entrada",
  WRONG_TIME: "Hora incorrecta",
  OTHER: "Otro motivo"
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const rows = await api.incidents();
      setIncidents(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando incidencias");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(incident: Incident, action: "RESOLVED" | "REJECTED") {
    setError(null);
    setNotice(null);
    try {
      await api.updateIncident(incident.id, action, notes[incident.id] || undefined);
      setNotice(action === "RESOLVED" ? "Incidencia resuelta." : "Incidencia rechazada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la incidencia");
    }
  }

  const pending = incidents.filter((i) => i.status === "PENDING");
  const done = incidents.filter((i) => i.status !== "PENDING");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incidencias"
        description="Bandeja de olvidos y anomalías reportadas por empleados."
      />

      {error ? <div className="rounded-lg bg-danger-soft p-4 text-sm text-danger">{error}</div> : null}
      {notice ? (
        <div className="rounded-lg border border-success/20 bg-success-soft p-4 text-sm text-success">
          {notice}
        </div>
      ) : null}

      <SectionCard title="Pendientes" description="Requieren acción del manager.">
        {pending.length === 0 ? (
          <EmptyState title="Sin incidencias pendientes" description="Todo el equipo al día." />
        ) : (
          <div className="divide-y divide-border">
            {pending.map((incident) => (
              <div key={incident.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1.2fr_1.6fr_auto]">
                <div>
                  <div className="font-semibold text-ink">
                    {TYPE_LABEL[incident.type] ?? incident.type}
                  </div>
                  <div className="mt-1 text-sm text-muted">{incident.affected_date}</div>
                  {incident.description ? (
                    <p className="mt-2 text-sm text-muted">{incident.description}</p>
                  ) : null}
                  <div className="mt-3">
                    <StatusBadge status={incident.status} />
                  </div>
                </div>

                <label className="text-sm font-medium text-ink">
                  Nota de resolución (opcional)
                  <textarea
                    value={notes[incident.id] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [incident.id]: e.target.value }))
                    }
                    className="mt-2 min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm"
                    placeholder="Ej: Verificado con el empleado, horario correcto..."
                  />
                </label>

                <div className="flex flex-col justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => act(incident, "RESOLVED")}
                    className="h-10 rounded-md bg-primary px-5 text-sm font-semibold text-white"
                  >
                    Resolver
                  </button>
                  <button
                    type="button"
                    onClick={() => act(incident, "REJECTED")}
                    className="h-10 rounded-md border border-border bg-white px-5 text-sm font-semibold text-danger hover:bg-danger-soft"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {done.length > 0 ? (
        <SectionCard title="Historial" description="Incidencias ya gestionadas.">
          <div className="divide-y divide-border">
            {done.map((incident) => (
              <div key={incident.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_1fr_0.8fr_1fr]">
                <div>
                  <div className="font-medium text-ink">
                    {TYPE_LABEL[incident.type] ?? incident.type}
                  </div>
                  <div className="mt-1 text-xs text-muted">{incident.affected_date}</div>
                </div>
                <div className="text-sm text-muted">{incident.description ?? "—"}</div>
                <StatusBadge status={incident.status} />
                <div className="text-sm text-muted">{incident.resolution_note ?? "—"}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
