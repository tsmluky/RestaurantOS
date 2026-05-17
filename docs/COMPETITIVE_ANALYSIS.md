# Análisis competitivo

Referencias evaluadas antes de construir RestaurantOS.

## SameSystem (Dinamarca)

**Posicionamiento**: Workforce management exclusivo retail + hostelería. 15+ años. Sirve cadenas con jerarquía country/district/department.

### Módulos visibles (8)

1. Perfect AI-planning (scheduling automático con forecast)
2. Modern app (móvil empleado + manager, 4.5★)
3. Automation of administration (plantillas, reglas HR)
4. **Attendance tracking** (fichaje con iBeacon Bluetooth)
5. Improved daily operations (tasks, comms, dashboards)
6. Timesaving integrations (POS, nóminas, ERP)
7. Motivated teams (encuestas, reconocimiento)
8. Business overview (dashboards comparativos)

### Patrones útiles detectados

- App de fichaje **separada** del resto en App Store ("SameSystem Check-In"). Reduce fricción.
- Fichaje con iBeacon Bluetooth (~€25/u), regalado al cliente. Resuelve "fichar desde casa".
- "Provide a reason" inline cuando se ficha fuera del turno esperado → genera dato de incidencia automático.
- Vocabulario propio: *validated hours*, *lend-outs*, *open shifts*, *deviation*.
- Dashboards comparativos multi-tienda con KPIs uniformes.

### Errores detectados (oportunidades)

- ❌ Traducción al español defectuosa: **"Tiene nada programado por hoy"** debería ser "No tiene nada programado para hoy".
- ❌ Nombres de empleado truncados ("Franci...", "JOLIB...").
- ❌ Celdas rosa pálido sin etiqueta → ambigüedad de estado.
- ❌ "0 min" decorativo en cada celda añade ruido.
- ❌ Formato decimal de horas "18,88h" en lugar de "18h 53min".
- ❌ Día actual no destacado claramente en grid semanal.
- ❌ FAB con kebab sin pista visual del contenido.

### Lecciones para RestaurantOS

1. **Español nativo es diferenciador real**. SameSystem lleva 15 años y aún tiene errores de traducción.
2. **Tablet + PIN en MVP** es decisión correcta. iBeacon vendría en v1.1 como upgrade hardware.
3. **Captura del motivo inline** al fichar fuera de turno (cuando exista Módulo 2 Turnos).

---

## 7shifts (Canadá/USA)

**Posicionamiento**: Scheduling-first para restaurantes. Freemium. App con 4.8★.

### Estructura

| Tab | Contenido |
|---|---|
| Schedule | Drag-and-drop semanal, plantillas reutilizables |
| Time Clocking | Punch in/out, geofencing opcional |
| Team Chat | Mensajería interna |
| Shift Pool | Empleados publican turnos para cubrir |
| Reports | Labor vs sales, overtime, tardiness |
| Tip Pooling | Pool de propinas (USA-specific) |
| Hiring | ATS ligero |

### Patrón clave

**Hero number del dashboard manager** = *Labor % of Sales* (coste laboral como % de ventas). Una métrica grande, todo lo demás contexto.

### Aplicable a RestaurantOS

- Drag-and-drop semanal para Módulo 2 Turnos.
- Templates de horarios (manager guarda "semana típica" y duplica).
- Onboarding empleado por SMS/magic link, sin contraseña en primer uso.

---

## Homebase (USA)

**Posicionamiento**: "Everything app for hourly teams". Freemium 1 location. 200+ integraciones.

### Patrones útiles

- Multi-device fichaje: smartphone + tablet + desktop + POS.
- **Photo verification de clock-ins** en plan Pro: foto frontal, hash. Antifraude sin hardware.
- Free tier 1 location como adquisición → presión competitiva.
- 200+ integraciones (Square, Quickbooks, Xero, Gusto) = su moat.

### Aplicable a RestaurantOS

- **Photo en fichaje** en v1.1 como diferencial vendible (antifraude).
- No competir en integraciones — competir en soporte humano + español.

---

## Posicionamiento de RestaurantOS

Lo que RestaurantOS **es**:

- Sistema operativo simple para restaurantes españoles de 5-30 empleados.
- Onboarding en < 30 minutos.
- Soporte humano en español por Studio32.
- Español nativo, no traducido.
- Hecho para que un manager no-técnico lo entienda solo.

Lo que RestaurantOS **NO es**:

- Una alternativa enterprise a SameSystem.
- Una agencia de marketing.
- Un sistema POS o de reservas (esos son módulos futuros).
- Una herramienta freemium con base infinita gratis.

## Tabla resumen comparativo

| Feature | SameSystem | 7shifts | Homebase | RestaurantOS MVP |
|---|---|---|---|---|
| Fichaje | iBeacon | App + geofence | Multi-device | Tablet + PIN |
| Scheduling | AI forecast | Drag-drop | Templates | v2.0 |
| Multi-tenant | Enterprise | Sí | Sí | Sí desde día 1 |
| Photo verify | No | No | Sí (Pro) | v1.1 |
| Idioma | Multi (traducido) | EN | EN/ES | Español nativo |
| Soporte | Email | Chat | Email/chat | Humano WhatsApp |
| Precio | Enterprise | $29.99+/loc | $24.95+/loc | Por definir |
| Diferencia | Madurez | Restaurantes US | Free tier | Cercanía + simplicidad |
