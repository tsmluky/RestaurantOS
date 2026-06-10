import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";

const steps = [
  "Manager inicia sesión en una tablet del local.",
  "Selecciona sucursal.",
  "Empleado introduce su PIN.",
  "La tablet decide entrada o salida según estado actual.",
  "El evento queda registrado como TABLET + PIN."
];

export default function KioskPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tablet kiosk"
        description="Fallback MVP para empleados que no quieran instalar la app móvil."
      />
      <SectionCard title="Activar kiosk en este dispositivo" description="Pantalla completa con PIN, lista para el ordenador o tablet del local.">
        <div className="p-5">
          <a
            href="/kiosk-mode"
            className="inline-block rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white"
          >
            Abrir modo kiosk
          </a>
          <p className="mt-3 text-sm text-muted">
            Consejo: en el PC del local, abre esta URL en Chrome y pulsa F11 para pantalla completa.
          </p>
        </div>
      </SectionCard>
      <SectionCard title="Flujo" description="El backend usa /clock/kiosk.">
        <div className="grid gap-3 p-5 md:grid-cols-2">
          {steps.map((step, index) => (
            <div key={step} className="rounded-md border border-border bg-gray-50 p-4">
              <div className="text-xs font-semibold text-primary">Paso {index + 1}</div>
              <div className="mt-2 text-sm text-ink">{step}</div>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Pendiente visual" description="Pantalla PIN grande y confirmación de fichaje.">
        <div className="p-5">
          <div className="mx-auto max-w-sm rounded-lg border border-border bg-white p-4 shadow-panel">
            <div className="text-center text-sm font-semibold text-muted">Paffuto Barceloneta</div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) => (
                <button
                  key={key || "blank"}
                  type="button"
                  className="h-16 rounded-md border border-border bg-gray-50 text-xl font-semibold text-ink"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
