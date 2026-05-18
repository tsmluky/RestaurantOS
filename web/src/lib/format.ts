import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return format(parseISO(value), "dd MMM, HH:mm", { locale: es });
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  return format(parseISO(value), "HH:mm", { locale: es });
}

export function formatDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${String(mins).padStart(2, "0")}min`;
}

export function todayISODate() {
  return format(new Date(), "yyyy-MM-dd");
}

export function monthStartISODate() {
  return format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
}
