"use client";

import { FormEvent, useEffect, useState } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import type { Employee, Restaurant } from "@/lib/types";

type EmployeeEditState = {
  full_name: string;
  email: string;
  phone: string;
  primary_restaurant_id: string;
  contract_hours_week: number | "";
  status: "ACTIVE" | "INACTIVE" | "TERMINATED";
};

function employeeToEditState(employee: Employee): EmployeeEditState {
  return {
    full_name: employee.full_name,
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    primary_restaurant_id: employee.primary_restaurant_id ?? "",
    contract_hours_week: employee.contract_hours_week ?? "",
    status: employee.status as EmployeeEditState["status"]
  };
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [editForms, setEditForms] = useState<Record<string, EmployeeEditState>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [pinByEmployee, setPinByEmployee] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "demo-employee",
    kiosk_pin: "",
    primary_restaurant_id: "",
    contract_hours_week: 40
  });

  async function load() {
    try {
      setError(null);
      const [employeeRows, restaurantRows] = await Promise.all([api.employees(), api.restaurants()]);
      setEmployees(employeeRows);
      setRestaurants(restaurantRows);
      setEditForms(Object.fromEntries(employeeRows.map((employee) => [employee.id, employeeToEditState(employee)])));
      if (!form.primary_restaurant_id && restaurantRows[0]) {
        setForm((current) => ({ ...current, primary_restaurant_id: restaurantRows[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando empleados");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setCreatedPin(null);
    try {
      await api.createEmployee({
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        password: form.password || null,
        kiosk_pin: form.kiosk_pin || null,
        primary_restaurant_id: form.primary_restaurant_id || null,
        contract_hours_week: Number(form.contract_hours_week) || null
      });
      setCreatedPin(form.kiosk_pin || "Generado manualmente desde Reset PIN");
      setForm((current) => ({
        ...current,
        full_name: "",
        email: "",
        phone: "",
        kiosk_pin: ""
      }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el empleado");
    }
  }

  async function resetPin(employeeId: string) {
    setError(null);
    setNotice(null);
    try {
      const response = await api.resetEmployeePin(employeeId);
      setPinByEmployee((current) => ({ ...current, [employeeId]: response.kiosk_pin }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo resetear el PIN");
    }
  }

  function updateEditForm(employeeId: string, patch: Partial<EmployeeEditState>) {
    setEditForms((current) => ({
      ...current,
      [employeeId]: {
        ...current[employeeId],
        ...patch
      }
    }));
  }

  async function saveEmployee(employeeId: string) {
    const edit = editForms[employeeId];
    if (!edit) return;
    setError(null);
    setNotice(null);
    try {
      await api.updateEmployee(employeeId, {
        full_name: edit.full_name,
        email: edit.email || null,
        phone: edit.phone || null,
        primary_restaurant_id: edit.primary_restaurant_id || null,
        contract_hours_week:
          edit.contract_hours_week === "" ? null : Number(edit.contract_hours_week),
        status: edit.status
      });
      setNotice("Empleado actualizado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el empleado");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empleados"
        description="Alta, edición operativa, sucursal principal, estado de acceso y PIN kiosk."
      />
      {error ? <div className="rounded-lg bg-danger-soft p-4 text-sm text-danger">{error}</div> : null}
      {notice ? (
        <div className="rounded-lg border border-success/20 bg-success-soft p-4 text-sm text-success">
          {notice}
        </div>
      ) : null}
      {createdPin ? (
        <div className="rounded-lg border border-success/20 bg-success-soft p-4 text-sm text-success">
          Empleado creado. PIN kiosk: <strong>{createdPin}</strong>
        </div>
      ) : null}

      <form
        onSubmit={createEmployee}
        className="rounded-lg border border-border bg-surface p-5 shadow-panel"
      >
        <h2 className="text-base font-semibold text-ink">Nuevo empleado</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm font-medium text-ink">
            Nombre
            <input
              value={form.full_name}
              onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
              required
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Email
            <input
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
              type="email"
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Teléfono
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Sucursal
            <select
              value={form.primary_restaurant_id}
              onChange={(event) => setForm({ ...form, primary_restaurant_id: event.target.value })}
              className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
            >
              {restaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-ink">
            Contraseña temporal
            <input
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
              minLength={8}
            />
          </label>
          <label className="text-sm font-medium text-ink">
            PIN kiosk
            <input
              value={form.kiosk_pin}
              onChange={(event) => setForm({ ...form, kiosk_pin: event.target.value })}
              className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
              inputMode="numeric"
              pattern="[0-9]{4,6}"
              placeholder="4-6 dígitos"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-5 h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white"
        >
          Crear empleado
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Empleado</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Sucursal</th>
              <th className="px-4 py-3">Horas contrato</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">PIN kiosk</th>
              <th className="px-4 py-3">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.map((employee) => {
              const edit = editForms[employee.id] ?? employeeToEditState(employee);
              return (
                <tr key={employee.id} className={employee.status === "ACTIVE" ? "" : "bg-gray-50/70"}>
                  <td className="px-4 py-4">
                    <input
                      value={edit.full_name}
                      onChange={(event) => updateEditForm(employee.id, { full_name: event.target.value })}
                      className="h-9 w-44 rounded-md border border-border px-3 text-sm font-medium text-ink"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      value={edit.email}
                      onChange={(event) => updateEditForm(employee.id, { email: event.target.value })}
                      className="h-9 w-52 rounded-md border border-border px-3 text-sm text-muted"
                      type="email"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      value={edit.phone}
                      onChange={(event) => updateEditForm(employee.id, { phone: event.target.value })}
                      className="h-9 w-32 rounded-md border border-border px-3 text-sm text-muted"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={edit.primary_restaurant_id}
                      onChange={(event) =>
                        updateEditForm(employee.id, { primary_restaurant_id: event.target.value })
                      }
                      className="h-9 w-48 rounded-md border border-border px-3 text-sm text-muted"
                    >
                      <option value="">Sin sucursal</option>
                      {restaurants.map((restaurant) => (
                        <option key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <input
                      value={edit.contract_hours_week}
                      onChange={(event) =>
                        updateEditForm(employee.id, {
                          contract_hours_week:
                            event.target.value === "" ? "" : Number(event.target.value)
                        })
                      }
                      className="h-9 w-24 rounded-md border border-border px-3 text-sm text-muted"
                      max={80}
                      min={0}
                      type="number"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <StatusBadge status={employee.status} />
                      <select
                        value={edit.status}
                        onChange={(event) =>
                          updateEditForm(employee.id, {
                            status: event.target.value as EmployeeEditState["status"]
                          })
                        }
                        className="h-9 w-36 rounded-md border border-border px-3 text-xs font-semibold text-ink"
                      >
                        <option value="ACTIVE">Activo</option>
                        <option value="INACTIVE">Inactivo</option>
                        <option value="TERMINATED">Baja</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {pinByEmployee[employee.id] ? (
                      <span className="mb-2 block w-fit rounded-md bg-warning-soft px-2 py-1 font-mono text-xs font-semibold text-warning">
                        {pinByEmployee[employee.id]}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => resetPin(employee.id)}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-gray-50"
                    >
                      Reset PIN
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => saveEmployee(employee.id)}
                      className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white"
                    >
                      Guardar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {employees.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted">No hay empleados todavía.</div>
        ) : null}
      </div>
    </div>
  );
}
