"use client";

import { AlertTriangle, CheckCircle2, Clock, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { ClockLiveResponse } from "@/lib/types";

export default function DashboardPage() {
  const [data, setData] = useState<ClockLiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setError(null);
      setData(await api.live());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const needsReview = useMemo(
    () => data?.employees.filter((employee) => employee.flagged_reasons.length > 0) ?? [],
    [data]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dashboard live</h1>
          <p className="mt-1 text-sm text-muted">
            Estado del restaurante ahora mismo. Se actualiza cada 30 segundos.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="h-10 rounded-md border border-border bg-white px-4 text-sm font-semibold shadow-sm hover:bg-gray-50"
        >
          Actualizar
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-danger/20 bg-danger-soft p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={UsersRound}
          label="Trabajando"
          value={loading ? "-" : data?.summary.clocked_in ?? 0}
        />
        <MetricCard
          icon={Clock}
          label="Fuera"
          value={loading ? "-" : data?.summary.off_duty ?? 0}
        />
        <MetricCard icon={AlertTriangle} label="A revisar" value={needsReview.length} tone="warning" />
        <MetricCard icon={CheckCircle2} label="Última actualización" value={data ? "OK" : "-"} />
      </section>

      <section className="rounded-lg border border-border bg-surface shadow-panel">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-ink">Equipo</h2>
          <p className="mt-1 text-sm text-muted">
            {data ? `Snapshot ${formatDateTime(data.now)}` : "Cargando empleados..."}
          </p>
        </div>
        <div className="divide-y divide-border">
          {(data?.employees ?? []).map((employee) => (
            <div
              key={employee.employee_id}
              className="grid gap-3 px-5 py-4 sm:grid-cols-[1.5fr_0.8fr_0.8fr_1fr]"
            >
              <div>
                <div className="font-medium text-ink">{employee.full_name}</div>
                <div className="mt-1 text-xs text-muted">{employee.employee_id.slice(0, 8)}</div>
              </div>
              <div>
                <StatusBadge status={employee.status} />
              </div>
              <div className="text-sm text-muted">
                {employee.elapsed_minutes !== null ? formatDuration(employee.elapsed_minutes) : "-"}
              </div>
              <div className="text-sm text-muted">
                {employee.flagged_reasons.length > 0
                  ? employee.flagged_reasons.join(", ")
                  : employee.clock_in_at
                    ? `Entrada ${formatDateTime(employee.clock_in_at)}`
                    : "Sin fichaje abierto"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone = "default"
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-panel">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        <span
          className={
            tone === "warning"
              ? "rounded-md bg-warning-soft p-2 text-warning"
              : "rounded-md bg-primary-soft p-2 text-primary"
          }
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-4 text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}
