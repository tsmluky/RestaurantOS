"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { api, getAccessToken } from "@/lib/api";
import { monthStartISODate, todayISODate } from "@/lib/format";

export default function ExportsPage() {
  const [dateFrom, setDateFrom] = useState(monthStartISODate());
  const [dateTo, setDateTo] = useState(todayISODate());
  const [format, setFormat] = useState<"CSV" | "XLSX" | "PDF">("CSV");

  async function downloadWithFetch() {
    const token = getAccessToken();
    if (!token) return;
    const response = await fetch(api.exportUrl(dateFrom, dateTo, format), {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await response.blob();
    const href = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `restaurantos-horas.${format.toLowerCase()}`;
    link.click();
    window.URL.revokeObjectURL(href);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Exportaciones</h1>
        <p className="mt-1 text-sm text-muted">Descarga mensual de horas para revisión interna o gestoría.</p>
      </div>
      <section className="max-w-xl rounded-lg border border-border bg-surface p-5 shadow-panel">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink">
            Desde
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Hasta
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Formato
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as "CSV" | "XLSX" | "PDF")}
              className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
            >
              <option value="CSV">CSV</option>
              <option value="XLSX">Excel</option>
              <option value="PDF">PDF</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={downloadWithFetch}
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Descargar
        </button>
      </section>
    </div>
  );
}
