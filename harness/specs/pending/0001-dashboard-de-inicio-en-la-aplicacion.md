---
id: 0001-dashboard-de-inicio-en-la-aplicacion
title: Dashboard de inicio en la aplicación
status: en proceso
created: 2026-08-20
updated: 2026-08-20
tasks: [T-0001, T-0002, T-0003, T-0004, T-0005, T-0006, T-0007, T-0008, T-0009]
---

# Dashboard de inicio en la aplicación

## Estado

`en proceso`

## Descripción

La pantalla de inicio (`/home`) muestra hoy un "Hello World". Se reemplaza por un
dashboard que responde, de un vistazo, a tres preguntas sobre un periodo elegido por
el usuario: **en qué gasto**, **de dónde ingreso** y **cómo se comportan gasto e
ingreso a lo largo del periodo**.

Comportamiento esperado:

- Un **selector de periodo único** en la cabecera del dashboard, con las opciones
  `día`, `semana`, `mes` y `año` (todos "en curso", relativos a hoy) más un
  **rango personalizado** con fecha de inicio y fin. El periodo por defecto al entrar
  es el **mes en curso**.
- El selector gobierna **las tres gráficas a la vez**: no existen filtros
  independientes por gráfica, precisamente para que no puedan mostrar periodos
  distintos y confundir la lectura.
- **Gráfica de dona de gastos por categoría** del periodo. Cada porción usa el color
  de su categoría. En el **centro de la dona aparece el total de gastos del periodo**.
- **Gráfica de dona de ingresos por categoría**, idéntica en forma y comportamiento,
  con el total de ingresos al centro.
- **Gráfica lineal de gastos vs ingresos** del mismo periodo, con dos series. Incluye
  un **toggle "Ritmo / Acumulado"**: en modo *ritmo* cada punto es el total de su
  intervalo; en modo *acumulado* cada punto es la suma corrida desde el inicio del
  periodo. La granularidad se deriva del periodo: día → por hora, semana y mes → por
  día, año → por mes; en un rango personalizado se elige según su duración.
- Las transacciones sin categoría se agrupan bajo **"Sin categoría"** con un color
  neutro, en lugar de descartarse.
- Un periodo sin movimientos muestra un **estado vacío explícito**, no una gráfica en
  blanco ni un error.

### Alcance

- Backend (`apps/backend`): módulo `transactions`. Nuevo método de agregación en el
  port `TransactionRepository` y su adaptador de Mongo; nuevo caso de uso
  `GetTransactionsSummaryUseCase`; nuevo endpoint `GET /transactions/summary`
  protegido con `JwtAuthGuard`, con sus DTOs de query y de respuesta.
- Frontend (`apps/frontend`): nueva dependencia `chart.js` + `vue-chartjs` con su
  registro tree-shakeable en `src/plugins/`; `src/types/summary.ts`; método
  `getSummary` en `src/services/transactions.ts`; nuevo `src/stores/dashboard.ts`;
  utilidades puras en `src/utils/period.ts` y `src/utils/summary.ts`; componentes
  `PeriodFilter` y las tarjetas de dona y de línea; organism `DashboardSummary`;
  y reescritura de `src/views/HomeView.vue`.

### Fuera de alcance

- Presupuestos, metas de ahorro y cualquier proyección a futuro.
- Comparativa contra periodos anteriores (mes vs mes anterior, variaciones %).
- Filtrar el dashboard por cuenta, tipo de cuenta o tags.
- Multi-moneda o conversión: se mantiene el formateo actual de `utils/money.ts`.
- Exportar o descargar el dashboard (PDF, CSV, imagen).
- Drill-down: hacer clic en una porción no navega al detalle de transacciones.
- Persistir el periodo elegido entre sesiones o entre recargas.
- Actualización en tiempo real; los datos se recargan al cambiar de periodo.
- Cualquier cambio al CRUD existente de transacciones, cuentas o categorías.

## Decisiones

| Decisión | Alternativas descartadas | Motivo |
| --- | --- | --- |
| El resumen se calcula en el **backend** con una agregación de Mongo | Agregar en el navegador desde `GET /transactions` | La lista está paginada (`limit` por defecto 20); agregar en el front obligaría a descargar todas las transacciones del periodo |
| Gráficas con **Chart.js + vue-chartjs** | SVG propio; ApexCharts | Decisión del usuario: librería madura y peso intermedio (~200 KB) frente al control total del SVG a medida |
| La línea ofrece **ritmo y acumulado** con un toggle | Solo ritmo; solo acumulado | Decisión del usuario: cubre tanto "¿qué días gasté más?" como "¿voy ganando o perdiendo en el periodo?" |
| El backend devuelve `categoryId` y totales; **el nombre y el color los resuelve el frontend** | Que el backend haga `$lookup` contra categorías | Evita acoplar el módulo `transactions` con `categories`; el frontend ya tiene ambos datos en su store de categorías |
| Los buckets se alinean a una **zona IANA** (`timeZone` en `SummaryQuery`) | Truncar en UTC | Truncar en UTC agruparía los "días" de 18:00 a 18:00 para un usuario en UTC-6; la Descripción exige hora local. Amplía la firma del AC-1 de T-0001 |
| La **granularidad viaja como parámetro** validado del endpoint | Que el backend la infiera del rango | Mantiene el caso de uso explícito y testeable, y deja la decisión de presentación en el frontend |

## Tareas enlazadas

<!-- Generado por harness/scripts/harness.mjs. No editar a mano. -->

| ID | Título | Status | Implementada |
| --- | --- | --- | --- |
| T-0001 | Add summary aggregation to the transactions repository port | `completada` | 2026-08-20 |
| T-0002 | Expose GET /transactions/summary endpoint | `completada` | 2026-08-20 |
| T-0003 | Add period calculation utilities | `completada` | 2026-08-20 |
| T-0004 | Add summary types, service method and dashboard store | `completada` | 2026-08-20 |
| T-0005 | Register Chart.js and map summary data to chart datasets | `completada` | 2026-08-20 |
| T-0006 | Build the PeriodFilter component | `completada` | 2026-08-20 |
| T-0007 | Build the category donut card with centered total | `completada` | 2026-08-20 |
| T-0008 | Build the income vs expense line card with ritmo/acumulado toggle | `completada` | 2026-08-20 |
| T-0009 | Replace HomeView with the dashboard layout | `pendiente` | — |

## Historial de cambios

| Fecha | Cambio |
| --- | --- |
| 2026-08-20 | Spec creado con status `no implementado`. |
| 2026-08-20 | Tarea T-0001 creada: Add summary aggregation to the transactions repository port. |
| 2026-08-20 | Tarea T-0002 creada: Expose GET /transactions/summary endpoint. |
| 2026-08-20 | Tarea T-0003 creada: Add period calculation utilities. |
| 2026-08-20 | Tarea T-0004 creada: Add summary types, service method and dashboard store. |
| 2026-08-20 | Tarea T-0005 creada: Register Chart.js and map summary data to chart datasets. |
| 2026-08-20 | Tarea T-0006 creada: Build the PeriodFilter component. |
| 2026-08-20 | Tarea T-0007 creada: Build the category donut card with centered total. |
| 2026-08-20 | Tarea T-0008 creada: Build the income vs expense line card with ritmo/acumulado toggle. |
| 2026-08-20 | Tarea T-0009 creada: Replace HomeView with the dashboard layout. |
| 2026-08-20 | Tarea T-0001: `pendiente` → `en proceso`. |
| 2026-08-20 | Status: `no implementado` → `en proceso`. |
| 2026-08-20 | T-0001: se añade `timeZone` a `SummaryQuery` para alinear los buckets al calendario local (ver Decisiones). |
| 2026-08-20 | Tarea T-0001: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0002: `pendiente` → `en proceso`. |
| 2026-08-20 | Tarea T-0002: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0003: `pendiente` → `en proceso`. |
| 2026-08-20 | Tarea T-0003: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0004: `pendiente` → `en proceso`. |
| 2026-08-20 | Tarea T-0004: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0005: `pendiente` → `en proceso`. |
| 2026-08-20 | Tarea T-0005: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0006: `pendiente` → `en proceso`. |
| 2026-08-20 | Tarea T-0006: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0007: `pendiente` → `en proceso`. |
| 2026-08-20 | Tarea T-0007: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0008: `pendiente` → `en proceso`. |
| 2026-08-20 | Tarea T-0008: `en proceso` → `completada`. |
