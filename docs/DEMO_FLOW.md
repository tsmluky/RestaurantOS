# RestaurantOS — Demo Flow

## Producción (presentación MVP)

- Web manager: https://restaurant-os-pink.vercel.app/login
- API: https://restaurantos-production-35e8.up.railway.app (health: `/health`)
- Tenant demo real: La Mona (Valencia)
- Manager: tsmluky@gmail.com (contraseña: ver gestor de credenciales)
- Empleada de prueba: maria@lamona.es — PIN kiosk 1001
- Mobile: build EAS (`mobile/eas.json`, perfil `preview` genera APK)

## URLs locales

- Backend docs: http://127.0.0.1:8000/docs
- Web manager: http://127.0.0.1:3000/login

## Credenciales demo

Manager:

```txt
manager@demo.dev
demo-manager
```

Empleado móvil:

```txt
francisco.iannicelli@demo.dev
demo-employee
```

Kiosk PIN:

```txt
1004
```

## Recorrido recomendado para demo comercial

1. Login manager.
2. Dashboard live: ver empleados dentro/fuera.
3. Fichajes: enseñar sesiones cerradas y una sesión `NEEDS_REVIEW` fuera de zona.
4. Calendario: enseñar que los registros ya se agrupan por día.
5. Empleados: crear un empleado, editar datos básicos, cambiar sucursal, desactivar/reactivar y generar PIN kiosk.
6. Configuración: ajustar sucursales, radio GPS, tolerancia de tarde y máximo de sesión.
7. Correcciones: cerrar una sesión abierta, ajustar entrada/salida y enseñar que exige motivo.
8. Kiosk: explicar fallback tablet para empleados sin app personal.
9. Exportar: descargar CSV/XLSX/PDF mensual.

## Scripts útiles

```powershell
python scripts\reset_demo.py
python scripts\seed_demo.py
python scripts\test_clock_flow.py
python scripts\test_kiosk_flow.py
```

`reset_demo.py` borra y recrea solo la base local `restaurantos`; úsalo antes de una demo limpia.

## Decisión de producto vigente

El MVP es mobile-first, pero no mobile-only:

- App móvil con geolocalización puntual como flujo principal.
- Tablet kiosk con PIN como fallback MVP.
- Sin tracking continuo.
- Sin módulo de turnos completo todavía.
