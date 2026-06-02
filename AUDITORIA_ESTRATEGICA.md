# Auditoría estratégica — Studio32 · RestaurantOS

**Fecha:** 27 de mayo de 2026
**Documentos base:** `Studio32_Vision_Negocio_Sistemas_Digitales.pdf`, `README.md`, `AUDITORIA_MVP.md`, `docs/MODULE_1_FICHAJE.md`, `docs/COMPETITIVE_ANALYSIS.md`
**Para:** Francisco · Juanma (Studio32)
**Objetivo:** Decidir si esto se trabaja, cuánto se invierte y cómo se enfoca.

---

## 0. Resumen ejecutivo en 6 líneas

1. **Tenéis dos productos distintos en la misma cabeza.** El PDF describe un negocio de agencia premium con paquetes digitales. El código describe un SaaS de workforce management. No son el mismo negocio.
2. El **MVP real** (RestaurantOS / Módulo 1 Fichaje) es **un producto serio, bien construido y comercializable**.
3. La **Vision del PDF** tal cual está escrita es **demasiado ambiciosa y poco defendible** — y, peor, distrae del producto real.
4. El mercado del MVP real existe y es grande, pero **brutalmente competido** por jugadores con capital y 10 años de ventaja.
5. La decisión correcta no es "hacemos todo lo del PDF". Es **enfocar todo en convertir RestaurantOS en una empresa real**, y dejar HostOS / ClinicOS / RetailOS como narrativa de futuro, no como hoja de ruta.
6. **Sí vale la pena seguir.** Pero con un cambio de marco importante.

---

## 1. La disonancia central: PDF ≠ Código

Esto es lo primero que hay que aceptar. No es un detalle, es la pieza más importante de esta auditoría.

| Dimensión | Lo que dice el PDF | Lo que estáis construyendo |
|---|---|---|
| Categoría | Agencia premium "Digital Systems" con paquetes verticales | SaaS B2B multi-tenant para gestión laboral de restaurantes |
| Producto principal | Web + CRM + WhatsApp + IA asistente + automatización + reseñas | Fichaje, geofencing, kiosko, correcciones, exports nómina |
| Tipo de venta | Setup (1.8k-15k €) + mantenimiento (75-800 €/mes) | Suscripción SaaS recurrente (precio aún no validado) |
| Cliente ideal | Restaurante / apartamento / clínica / tienda que quiere "vender más online" | Restaurante de 5-30 empleados con dolor de control horario |
| Competencia real | Otras agencias locales, freelancers, plantillas web | SameSystem, 7shifts, Homebase, Combo, Sesame HR |
| Moat | "Modelo modular + IA + acompañamiento" | Multi-tenant, español nativo, integración nómina, geofence configurable |
| Escalabilidad | Margen pobre (cada cliente requiere implantación) | Margen alto si se reduce coste de onboarding |
| Tiempo a primer cliente | Inmediato (es vender servicios) | Rápido (producto demo-listo) |

**Conclusión técnica:** estáis construyendo un SaaS de verdad, no una agencia. Y eso es **mejor** de lo que cree el PDF. El problema es que la Vision os va a hacer dudar y diversificar antes de tiempo.

---

## 2. Inventario: lo que SÍ tenéis

### 2.1 Producto técnico (RestaurantOS MVP)

- **Backend**: FastAPI + SQLAlchemy 2 + PostgreSQL, multi-tenant desde día 1, auth JWT con refresh, append-only de eventos, geofencing configurable por sucursal, exports Excel/PDF/CSV.
- **App móvil**: Expo SDK 54, 9 pantallas, dos perfiles (empleado y kiosko), funciona end-to-end.
- **Dashboard web**: Next.js 14 con 10 páginas funcionales (dashboard, fichajes, correcciones, incidencias, horario, calendario, empleados, exports, kiosk, config).
- **Datos demo**: seed con un manager y 5 empleados reales, credenciales documentadas, demo-flow escrito.
- **Decisiones arquitectónicas cerradas**: el `MODULE_1_FICHAJE.md` es serio — no es un boceto, es spec de producto. Roles, modelo de datos, decisiones legales (append-only).
- **Análisis competitivo hecho**: tenéis estudiado SameSystem, 7shifts y Homebase, con patrones útiles y errores que podéis evitar.
- **Auditoría técnica reciente** (20/05/2026): 5 bugs corregidos, MVP marcado listo para demo.

Esto es **mucho más de lo que tiene el 95% de los "proyectos SaaS de un emprendedor"**. Estáis en el 5% que efectivamente ejecuta.

### 2.2 Marca y narrativa

- Studio32 como paraguas con criterio estratégico claro.
- Vocabulario propio (Core, Vertical OS, tiers).
- Una PDF presentable a inversores o socios.
- Pitch en español e inglés.
- Identidad: Valencia, "Digital Systems for real businesses".

### 2.3 Conocimiento operativo

- Saber moverse en restauración española (cliente final entendible).
- Capacidad de auto-organización (auditorías, docs, decisiones cerradas → bien documentadas).
- Visión a 3-5 años aunque mal calibrada en alcance.

---

## 3. Inventario: lo que NO tenéis

Esto es lo que duele leer pero es donde está el trabajo real.

### 3.1 Lo que no existe en código

- **No hay ni un solo módulo de los descritos en RestaurantOS del PDF**: carta digital, reservas, eventos, WhatsApp comercial, reseñas automáticas, promociones, fidelización. **Cero.** Lo único que existe es Fichaje.
- **No hay módulo de turnos** todavía (planificación con drag&drop estilo 7shifts).
- **No hay push notifications** ni avisos al empleado.
- **No hay flujo de aprobación de correcciones** conectado al estado real.
- **No hay onboarding self-service** de un tenant nuevo (todo se hace por seed o por admin).
- **No hay app de manager móvil** — solo web.
- **No hay integración con nómina ni POS** (que sería el moat duro frente a competidores).
- **No hay CI/CD, ni dominio, ni HTTPS, ni Sentry, ni Stripe operativo**. Es local-only.
- **No hay sistema de facturación** (a pesar de que en el modelo es lo que sostiene todo).

### 3.2 Lo que no existe en negocio

- **No hay ni un cliente pagando.** Ni uno. Cero.
- **No hay LOI ni contrato firmado** con ningún restaurante (ni siquiera "te lo doy gratis 3 meses").
- **No hay precio validado** — los rangos del PDF son del PDF, no del mercado real.
- **No hay caso de estudio real** que enseñar (los del PDF están en blanco).
- **No hay funnel comercial activo** — no hay landing pública, no hay leads inbound, no hay outbound estructurado.
- **No hay equipo de ventas, ni proceso de demo, ni pipeline en HubSpot/CRM real.**
- **No hay legal**: contratos modelo, política de privacidad operativa, RGPD aplicado, tratamiento de datos del empleado (esto es crítico para fichaje, hay regulación específica en España — registro horario obligatorio Ley 8/2019).
- **No hay caja para sostener 12-18 meses sin facturación**, o al menos no aparece en el documento.

### 3.3 Lo que no está decidido

- ¿Sois agencia o sois SaaS? El PDF no se moja.
- ¿Vendéis a 90 €/mes (precio SaaS realista para España) o a 350 €/mes (precio Growth del PDF)?
- ¿RestaurantOS es para 5-30 empleados (lo que dice `COMPETITIVE_ANALYSIS.md`) o para cualquier restaurante (lo que sugiere el PDF)?
- ¿Quién hace la implantación si os llegan 10 clientes al mes? Spoiler: nadie de los que está hoy.
- ¿Qué pasa con HostOS, ClinicOS, RetailOS — están planeados o son atrezzo?

---

## 4. ¿Esto tiene utilidad real? — Análisis honesto

### 4.1 ¿Hay dolor real en el cliente?

**Sí.** El fichaje en restaurantes españoles es un dolor:

- Obligatorio por ley (Ley 8/2019, registro diario de jornada).
- Multas reales (60-187.000 €) por incumplimiento.
- La mayoría usa Excel, cuaderno en la barra o sistemas de TPV poco usables.
- El cálculo de horas extras, complementos y nóminas es manual y caro.
- Las inspecciones de trabajo en hostelería son frecuentes.

Esto **no es un problema imaginario**. Es uno de los productos más vendibles del sector si se ataca con foco.

### 4.2 ¿Hay mercado?

- ~280.000 restaurantes y bares en España (INE, datos pre-2025).
- ~150.000 con plantilla suficiente para necesitar fichaje formal.
- Penetración de software estructurado: estimadamente <15 %.
- Ticket realista: 30-90 €/mes/local en el segmento 5-30 empleados.

**Ejercicio mental:** 0,5 % del mercado captable (~750 locales) × 60 €/mes = **45.000 € MRR ≈ 540 k€ ARR**. Es una empresa real de un equipo pequeño.

Esto valida que **hay tamaño suficiente** para no morir de hambre. No es un mercado tipo "vamos a ser unicornios", pero es un mercado tipo "podéis vivir bien de esto y crecer 20-40% al año".

### 4.3 ¿Hay competencia y os van a aplastar?

Sí hay competencia. No, no os van a aplastar automáticamente.

| Competidor | Fuerte en | Débil en |
|---|---|---|
| **SameSystem** | Cadenas grandes, AI scheduling | Caro, traducción al español pésima, complejo |
| **7shifts** | Restaurantes USA/Canadá, app brutal | Poca penetración España, sin soporte español real |
| **Homebase** | Free tier USA, integraciones | No localizado a España |
| **Sesame HR** | Fichaje España, branding fuerte | Genérico, no específico restaurantes |
| **Combo** | Fichaje + nómina restaurantes Francia | Su producto en España está flojo |
| **Bizneo, Factorial** | HR completo, marketing fuerte | Caros, generalistas, no entienden bar/cocina |
| **Excel + cuaderno** | Gratis y conocido | Ilegal técnicamente, error humano, cero analítica |

El hueco real: **producto enfocado solo en restaurante español pequeño/mediano, simple, soporte humano por WhatsApp, precio razonable, en español nativo (no traducción)**. Ese hueco existe y nadie lo ocupa bien.

### 4.4 ¿Lo del PDF (agencia premium con paquetes) tiene utilidad?

Honestamente: **mucho menos** que lo del SaaS.

- "Vendo webs + CRM + WhatsApp + automatización + IA asistente por 5.000 € + 250 €/mes" es exactamente lo que ofrecen 50.000 agencias en España.
- El "moat" descrito (playbooks, módulos reutilizables, IA agents internos) **no se ve por fuera** — el cliente solo ve "una agencia más, eso sí, cara".
- La IA del PDF (chatbot de carta, FAQ, atención) es **commodity 2026** — cualquiera la monta con OpenAI + Make en una tarde.
- Ese modelo escala mal: cada cliente nuevo requiere horas humanas de implantación, copywriting, diseño, configuración. Sois 2 personas (Francisco y Juanma) — el techo es bajísimo.
- Margen real de agencia: 20-35 %. Margen real de SaaS: 70-85 %. No es comparable.

**El PDF describe el peor de los dos mundos**: el coste de venta y entrega de una agencia, con la promesa (sin cumplir) de la escalabilidad de un SaaS.

---

## 5. ¿Esto va a algún lado? — Cinco escenarios

### Escenario A — Hacéis exactamente lo del PDF (4 verticales, agencia premium con módulos)

- **Probabilidad de éxito:** baja (≈ 15 %).
- **Por qué falla:** os disgregáis en 4 verticales sin haber validado uno. El esfuerzo de marketing, copy, ventas y entrega se multiplica × 4 sin músculo para soportarlo. El SaaS real que ya tenéis (RestaurantOS) muere por falta de atención.
- **Final probable:** dentro de 18 meses, 3-5 clientes pequeños, agotamiento, cierre o pivote forzado.

### Escenario B — Hacéis RestaurantOS como SaaS puro

- **Probabilidad de éxito:** media-alta (≈ 45 %).
- **Por qué funciona:** ya tenéis producto, mercado validable, dolor real, competencia floja en vuestro nicho concreto, y precio defendible.
- **Por qué puede fallar:** sin GTM probado, sin caja, sin equipo de ventas. SaaS B2B small business requiere mucho outbound o mucho contenido — ninguno de los dos está montado.
- **Final probable:** dentro de 18 meses, 30-80 clientes, MRR 2-6 k€, empresa pequeña pero viva y con futuro. Posibilidad real de añadir Módulo 2 (Turnos) y crecer.

### Escenario C — Hacéis RestaurantOS como SaaS + servicios de implantación premium (modelo híbrido bien hecho)

- **Probabilidad de éxito:** alta (≈ 55-60 %).
- **Cómo funciona:** RestaurantOS se vende como SaaS recurrente (60-150 €/mes/local). Studio32 ofrece **además** un paquete de implantación + setup web/Google/SEO/reseñas como onboarding pagado (800-2.500 €). El SaaS sostiene MRR. La implantación sostiene caja a corto plazo y reduce churn.
- **Por qué funciona:** es exactamente lo que un cliente quiere — "instaladmelo y dadme algo que funcione". Y aprovecháis las dos capacidades reales del equipo (producto + agencia).
- **Riesgo:** sigue habiendo que decidir prioridad y disciplina. Es fácil que el setup pagado se convierta en "agencia con SaaS de regalo" en vez de al revés.

### Escenario D — Hacéis solo agencia / outreach a restaurantes (sin SaaS)

- **Probabilidad de éxito:** media (≈ 40 % de tener ingresos).
- **Pero:** desperdicia todo el trabajo técnico hecho. No tiene escala. Trabajáis mucho por poco margen. Y compite directo con cientos de competidores baratos.

### Escenario E — Lo paráis

- **Cuándo tiene sentido:** si no podéis sostener 9-12 meses sin facturación significativa Y no tenéis paciencia para vender SaaS B2B (ciclos largos).
- **Si lo paráis ahora:** habéis aprendido FastAPI multi-tenant, Expo, sistema de diseño, gestión de producto. No es tiempo perdido. Pero el código se queda sin valor de mercado.

---

## 6. Pros y contras (los honestos, no los del PDF)

### Pros reales

1. **Producto técnico serio.** No es vaporware, no es "un MVP de fin de semana". Es código que se sostiene.
2. **Decisión multi-tenant correcta desde día 1.** Esto os ahorra un re-write enorme más adelante.
3. **Dolor del cliente real, recurrente y legalmente obligatorio.** Difícil que "no haya mercado".
4. **Hueco competitivo real**: español nativo + restaurantes pequeños + simple + cercano. Ningún jugador grande lo ocupa.
5. **Posibilidad de cross-sell verticales futuros** desde la base — pero como evolución, no como Big Bang.
6. **Capacidad demostrada de ejecutar producto.** Esto no es trivial.
7. **Stack moderno** que permite incorporar gente cuando llegue financiación o ingresos.

### Contras reales

1. **Cero clientes pagando.** El producto se mide por revenue, no por código.
2. **Cero validación de precio.** Los 90-300 €/mes son hipótesis, no realidad.
3. **GTM inexistente.** No hay landing pública, no hay outbound, no hay contenido, no hay funnel.
4. **Equipo de 2 personas técnicas.** Falta perfil de ventas/comercial/operaciones para escalar.
5. **PDF que confunde el negocio**: si lo presentáis tal cual a inversores, a clientes o a vosotros mismos, vais a tomar decisiones incoherentes.
6. **Riesgo legal específico**: el fichaje en España tiene exigencias concretas (Ley 8/2019, RGPD aplicado a empleados, conservación 4 años, etc.). No es opcional, es prerrequisito de vender.
7. **Restaurantes son clientes difíciles**: bajo CLTV, alto churn, pagan tarde, cierran a menudo, son cíclicos (temporada).
8. **El modelo del PDF (4 verticales) consume 4× el esfuerzo de marca y producto.** No tenéis ese músculo.
9. **El "moat de IA agents"** es discutible — los agentes están de moda y se commoditizan rápido.
10. **No hay caja descrita ni plan financiero**. El negocio se evalúa por meses de pista, no por entusiasmo.

---

## 7. Recomendación clara

### Lo que NO se debe hacer

- ❌ Lanzar Studio32 Digital Systems con 4 verticales en paralelo.
- ❌ Construir HostOS, ClinicOS o RetailOS antes de tener 5 restaurantes pagando RestaurantOS.
- ❌ Vender "paquete agencia" como producto principal — eso es commodity y bajo margen.
- ❌ Seguir añadiendo módulos al MVP sin haber vendido el actual (carta digital, reseñas, etc.).
- ❌ Tratar el PDF como hoja de ruta literal. Es una buena Vision, pero **no es un plan ejecutable**.

### Lo que SÍ se debe hacer

1. **Convertir el PDF en lo que de verdad es: un *narrative document* a 3-5 años.** No es el plan de los próximos 12 meses.
2. **Decidir el modelo**: RestaurantOS como SaaS + servicios de implantación premium (Escenario C). Es lo que mejor encaja con vuestras capacidades reales.
3. **Cerrar la primera unidad de venta vendible esta semana**: setup de 1.200-2.000 € + 90-150 €/mes, alcance claro, contrato simple.
4. **Vender a 3 clientes en los próximos 90 días.** Por outreach directo, contactos, restaurantes conocidos. No esperar a tener "todo perfecto".
5. **Cumplir requisitos legales mínimos** antes de la primera factura: registro horario conforme Ley 8/2019, política de privacidad, encargado de tratamiento, contrato modelo.
6. **Dejar HostOS / ClinicOS / RetailOS como nota al pie** en la presentación de inversores y socios — "expansión futura, post-validación RestaurantOS".
7. **Crear landing pública de RestaurantOS** (no de Studio32 genérico) con demo en vídeo y formulario de auditoría → conversación.
8. **Definir métricas trimestrales reales**: clientes pagando, MRR, churn, NPS. Quitar todas las métricas vanidad.
9. **Construir Módulo 2 (Turnos) solo después** de tener 5+ clientes activos en Fichaje. Antes no.
10. **Reservar 1 día/semana para "ventas"** desde ya. Es la habilidad que falta y la que decide si esto sobrevive.

---

## 8. Plan de 30 días (concreto, no aspiracional)

| Semana | Foco | Entregable |
|---|---|---|
| 1 | Decisión y posicionamiento | Reunión Francisco + Juanma para confirmar Escenario C. Documento de 1 página: "Vendemos RestaurantOS — Fichaje. Esto es lo que es y esto es lo que NO es." |
| 1 | Producto | Decidir el alcance exacto del paquete vendible (qué entra en setup, qué entra en mensualidad). Lista cerrada. |
| 2 | Comercial | Landing pública en restaurantos.studio32.es (o similar). Vídeo demo 90 segundos. Formulario "Auditoría laboral gratuita". |
| 2 | Legal | Contrato modelo, política de privacidad, encargado de tratamiento RGPD, checklist Ley 8/2019. |
| 3 | Operacional | Stripe operativo, dominio + HTTPS en producción, despliegue en Railway. Demo accesible públicamente. |
| 3 | Pipeline | Lista de 40 restaurantes objetivo en Valencia con datos de contacto. Plantilla de email/WhatsApp de prospección. Empezar outreach a 10/día. |
| 4 | Cierres | 3-5 conversaciones de demo agendadas. 1 cliente firmado (aunque sea con descuento de "fundador"). Caso de estudio en preparación. |

Si al final de los 30 días tenéis 0 conversaciones de demo, **el problema no es el producto: es la distribución**. Y entonces hay que invertir en aprender ventas B2B o sumar a alguien que las sepa. No hay atajo.

---

## 9. Veredicto final

**Sí vale la pena.** Pero con tres condiciones inegociables:

1. **Sois una empresa de software (SaaS) que ofrece implantación premium como onboarding. No una agencia.** Cualquier confusión interna sobre esto se va a notar fuera y os va a costar dinero.
2. **Foco brutal en RestaurantOS — Fichaje — durante 6-9 meses.** Sin HostOS, sin ClinicOS, sin nuevos módulos hasta tener 5-10 clientes felices pagando.
3. **Velocidad de aprendizaje comercial > velocidad de construcción técnica.** Ya tenéis más producto del que necesitáis para vender. Lo que falta es validación de mercado y máquina de ventas. Ese es el trabajo de los próximos 90 días.

Si las tres se cumplen, **dentro de 18 meses esto es una empresa con 30-80 clientes, equipo de 4-6 personas y MRR de 3-6 k€ creciente**. Eso es un negocio real y digno, no un unicornio pero sí algo que vale la pena construir.

Si alguna de las tres se rompe, esto se convierte en un proyecto técnico bonito que no llega a empresa. Y el problema no será el código.

---

*Documento preparado para discusión interna. Ninguna afirmación de este documento debe tomarse como verdad cerrada — están todas pensadas para retar, no para imponer. La conversación es vuestra.*
