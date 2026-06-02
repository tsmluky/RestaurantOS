"use client";

import { FormEvent, useEffect, useState } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { api } from "@/lib/api";
import type { Restaurant } from "@/lib/types";

type RestaurantFormState = {
  name: string;
  address: string;
  timezone: string;
  latitude: string;
  longitude: string;
  geofence_radius_m: number;
  late_tolerance_min: number;
  max_session_hours: number;
};

const DEFAULT_RESTAURANT_FORM: RestaurantFormState = {
  name: "",
  address: "",
  timezone: "Europe/Madrid",
  latitude: "",
  longitude: "",
  geofence_radius_m: 100,
  late_tolerance_min: 10,
  max_session_hours: 14
};

function toFormState(restaurant: Restaurant): RestaurantFormState {
  return {
    name: restaurant.name,
    address: restaurant.address ?? "",
    timezone: restaurant.timezone,
    latitude: restaurant.latitude ?? "",
    longitude: restaurant.longitude ?? "",
    geofence_radius_m: restaurant.geofence_radius_m,
    late_tolerance_min: restaurant.late_tolerance_min,
    max_session_hours: restaurant.max_session_hours
  };
}

function toPayload(form: RestaurantFormState) {
  return {
    name: form.name.trim(),
    address: form.address.trim() || null,
    timezone: form.timezone.trim() || "Europe/Madrid",
    latitude: form.latitude.trim() || null,
    longitude: form.longitude.trim() || null,
    geofence_radius_m: Number(form.geofence_radius_m),
    late_tolerance_min: Number(form.late_tolerance_min),
    max_session_hours: Number(form.max_session_hours)
  };
}

export default function ConfigPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [forms, setForms] = useState<Record<string, RestaurantFormState>>({});
  const [newRestaurant, setNewRestaurant] = useState<RestaurantFormState>(DEFAULT_RESTAURANT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const rows = await api.restaurants();
      setRestaurants(rows);
      setForms(Object.fromEntries(rows.map((restaurant) => [restaurant.id, toFormState(restaurant)])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando sucursales");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createRestaurant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await api.createRestaurant(toPayload(newRestaurant));
      setNewRestaurant(DEFAULT_RESTAURANT_FORM);
      setNotice("Sucursal creada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la sucursal");
    }
  }

  async function updateRestaurant(restaurantId: string) {
    const form = forms[restaurantId];
    if (!form) return;
    setError(null);
    setNotice(null);
    try {
      await api.updateRestaurant(restaurantId, toPayload(form));
      setNotice("Sucursal actualizada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la sucursal");
    }
  }

  function updateForm(restaurantId: string, patch: Partial<RestaurantFormState>) {
    setForms((current) => ({
      ...current,
      [restaurantId]: {
        ...current[restaurantId],
        ...patch
      }
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Sucursales, radio GPS y reglas base para el fichaje operativo."
      />

      {error ? <div className="rounded-lg bg-danger-soft p-4 text-sm text-danger">{error}</div> : null}
      {notice ? (
        <div className="rounded-lg border border-success/20 bg-success-soft p-4 text-sm text-success">
          {notice}
        </div>
      ) : null}

      <SectionCard
        title="Sucursales"
        description="Cada empleado puede tener una sucursal principal, pero el sistema soporta varias ubicaciones desde el MVP."
      >
        <div className="divide-y divide-border">
          {restaurants.map((restaurant) => {
            const form = forms[restaurant.id] ?? toFormState(restaurant);
            return (
              <div key={restaurant.id} className="p-5">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-base font-semibold text-ink">{restaurant.name}</h3>
                    <p className="mt-1 text-sm text-muted">{restaurant.address || "Sin dirección"}</p>
                  </div>
                  <span className="rounded-md bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                    Radio {restaurant.geofence_radius_m} m
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="text-sm font-medium text-ink">
                    Nombre
                    <input
                      value={form.name}
                      onChange={(event) => updateForm(restaurant.id, { name: event.target.value })}
                      className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
                    />
                  </label>
                  <label className="text-sm font-medium text-ink md:col-span-2">
                    Dirección
                    <input
                      value={form.address}
                      onChange={(event) => updateForm(restaurant.id, { address: event.target.value })}
                      className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
                    />
                  </label>
                  <label className="text-sm font-medium text-ink">
                    Latitud
                    <input
                      value={form.latitude}
                      onChange={(event) => updateForm(restaurant.id, { latitude: event.target.value })}
                      className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
                      inputMode="decimal"
                      placeholder="41.3874"
                    />
                  </label>
                  <label className="text-sm font-medium text-ink">
                    Longitud
                    <input
                      value={form.longitude}
                      onChange={(event) => updateForm(restaurant.id, { longitude: event.target.value })}
                      className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
                      inputMode="decimal"
                      placeholder="2.1686"
                    />
                  </label>
                  <label className="text-sm font-medium text-ink">
                    Zona horaria
                    <input
                      value={form.timezone}
                      onChange={(event) => updateForm(restaurant.id, { timezone: event.target.value })}
                      className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
                    />
                  </label>
                  <label className="text-sm font-medium text-ink">
                    Radio GPS
                    <input
                      value={form.geofence_radius_m}
                      onChange={(event) =>
                        updateForm(restaurant.id, { geofence_radius_m: Number(event.target.value) })
                      }
                      className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
                      max={500}
                      min={25}
                      type="number"
                    />
                  </label>
                  <label className="text-sm font-medium text-ink">
                    Tolerancia tarde
                    <input
                      value={form.late_tolerance_min}
                      onChange={(event) =>
                        updateForm(restaurant.id, { late_tolerance_min: Number(event.target.value) })
                      }
                      className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
                      max={120}
                      min={0}
                      type="number"
                    />
                  </label>
                  <label className="text-sm font-medium text-ink">
                    Máx. sesión
                    <input
                      value={form.max_session_hours}
                      onChange={(event) =>
                        updateForm(restaurant.id, { max_session_hours: Number(event.target.value) })
                      }
                      className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
                      max={24}
                      min={1}
                      type="number"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => updateRestaurant(restaurant.id)}
                  className="mt-5 h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white"
                >
                  Guardar sucursal
                </button>
              </div>
            );
          })}
          {restaurants.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">No hay sucursales configuradas.</div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Nueva sucursal" description="Para pilotos con dos locales o futuras aperturas.">
        <form onSubmit={createRestaurant} className="grid gap-3 p-5 md:grid-cols-3">
          <label className="text-sm font-medium text-ink">
            Nombre
            <input
              value={newRestaurant.name}
              onChange={(event) => setNewRestaurant({ ...newRestaurant, name: event.target.value })}
              className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
              required
            />
          </label>
          <label className="text-sm font-medium text-ink md:col-span-2">
            Dirección
            <input
              value={newRestaurant.address}
              onChange={(event) => setNewRestaurant({ ...newRestaurant, address: event.target.value })}
              className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Latitud
            <input
              value={newRestaurant.latitude}
              onChange={(event) => setNewRestaurant({ ...newRestaurant, latitude: event.target.value })}
              className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
              inputMode="decimal"
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Longitud
            <input
              value={newRestaurant.longitude}
              onChange={(event) => setNewRestaurant({ ...newRestaurant, longitude: event.target.value })}
              className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
              inputMode="decimal"
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Radio GPS
            <input
              value={newRestaurant.geofence_radius_m}
              onChange={(event) =>
                setNewRestaurant({ ...newRestaurant, geofence_radius_m: Number(event.target.value) })
              }
              className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
              max={500}
              min={25}
              type="number"
            />
          </label>
          <button
            type="submit"
            className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white md:mt-7"
          >
            Crear sucursal
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
