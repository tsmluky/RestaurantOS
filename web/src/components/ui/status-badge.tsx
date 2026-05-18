import clsx from "clsx";

const styles: Record<string, string> = {
  CLOCKED_IN: "bg-success-soft text-success",
  OFF_DUTY: "bg-gray-100 text-muted",
  OPEN: "bg-primary-soft text-primary",
  CLOSED: "bg-success-soft text-success",
  CORRECTED: "bg-warning-soft text-warning",
  NEEDS_REVIEW: "bg-warning-soft text-warning",
  REJECTED: "bg-danger-soft text-danger",
  PENDING: "bg-warning-soft text-warning",
  RESOLVED: "bg-success-soft text-success",
  APPROVED: "bg-success-soft text-success",
  ACTIVE: "bg-success-soft text-success"
};

const labels: Record<string, string> = {
  CLOCKED_IN: "Trabajando",
  OFF_DUTY: "Fuera",
  OPEN: "Abierta",
  CLOSED: "Cerrada",
  CORRECTED: "Corregida",
  NEEDS_REVIEW: "Revisar",
  REJECTED: "Rechazada",
  PENDING: "Pendiente",
  RESOLVED: "Resuelta",
  APPROVED: "Aprobada",
  ACTIVE: "Activo"
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold",
        styles[status] ?? "bg-gray-100 text-muted"
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
