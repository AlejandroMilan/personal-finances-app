---
id: 0008-correcciones-de-la-vista-de-presupuestos
title: Correcciones de la vista de presupuestos
status: en proceso
created: 2026-08-25
updated: 2026-08-25
tasks: [T-0050, T-0051, T-0052, T-0053, T-0054]
---

# Correcciones de la vista de presupuestos

## Estado

`en proceso`

## Descripción

La feature de presupuestos ya permite crear un presupuesto mensual con partidas por
categoría y ver su avance, pero cuatro puntos de su uso diario resultan incómodos:
elegir el mes obliga a escribirlo, se puede añadir dos veces la misma categoría, no
se ve cuánto suma el presupuesto mientras se construye, y en el dashboard sólo se
comparan categorías sueltas sin un total.

Este spec corrige esas cuatro cosas, en términos de lo que el usuario observa:

1. **Mes elegible visualmente.** En la vista de presupuestos, además de poder escribir
   el mes, el usuario puede abrir un selector que muestra los doce meses del año y
   permite avanzar o retroceder de año, y elegir con un clic. La elección visual y la
   escrita quedan siempre sincronizadas: elegir en el selector actualiza el campo, y
   escribir un mes válido actualiza el selector.

2. **Categorías sin repetir al añadir partidas.** En el diálogo de creación/edición,
   al desplegar la categoría de una partida nueva no aparecen las categorías que ya
   están presupuestadas en otra partida del mismo tipo (gasto o ingreso) dentro del
   mismo diálogo. Si el usuario elimina esa partida o le cambia la categoría, la
   categoría liberada vuelve a estar disponible de inmediato. La categoría que la
   propia partida tiene seleccionada sigue visible en su propio desplegable. La misma
   categoría puede seguir usándose una vez como gasto y una vez como ingreso, tal y
   como ya lo permite el dominio (`Budget` rechaza duplicados por categoría **y** tipo).

3. **Total acumulado visible al presupuestar.** Mientras se editan las partidas, el
   diálogo muestra de forma fija (visible sin depender del scroll de la lista de
   partidas) el total presupuestado de gastos, el de ingresos y el balance entre
   ambos. Los totales se recalculan al añadir, editar o eliminar una partida, e
   ignoran las partidas con importe inválido.

4. **Totales de presupuesto vs. gasto en el dashboard.** La tarjeta de avance de
   presupuesto muestra, por encima del detalle por categoría, el total presupuestado
   del periodo y el total realmente gastado, con su diferencia y el porcentaje
   consumido. Si no hay presupuesto definido para el periodo, la tarjeta lo dice en
   lugar de mostrar totales en cero.

### Alcance

- Backend (`apps/backend`): ninguno. La API de presupuestos y el resumen del dashboard
  ya exponen todos los datos necesarios.
- Frontend (`apps/frontend`):
  - `components/molecules/` — nuevo selector visual de mes/año.
  - `components/organisms/BudgetFormDialog.vue` — filtrado de categorías y panel fijo
    de totales.
  - `components/organisms/BudgetStatusCard.vue` — cabecera de totales del periodo.
  - `views/BudgetsView.vue` — integración del selector visual.
  - `utils/budget.ts` — funciones puras de totales y de categorías disponibles.
  - Specs de test de los archivos anteriores.

### Fuera de alcance

- Cualquier cambio en `apps/backend` (entidades, casos de uso, DTOs o endpoints).
- Cambiar el modelo de datos del presupuesto o el formato del mes (`YYYY-MM`).
- Permitir presupuestos multi-mes, copiar presupuestos entre meses o plantillas nuevas.
- Rediseñar la tarjeta de avance por categoría (`BudgetCategoryBar`) o el resto del
  dashboard.
- Internacionalizar los textos: se mantiene el idioma que ya usa cada pantalla.
- Alertas o notificaciones por superar el total presupuestado.

## Tareas enlazadas

<!-- Generado por harness/scripts/harness.mjs. No editar a mano. -->

| ID | Título | Status | Implementada |
| --- | --- | --- | --- |
| T-0050 | Add a visual month and year picker molecule | `completada` | 2026-08-25 |
| T-0051 | Wire the visual month picker into the budgets view | `completada` | 2026-08-25 |
| T-0052 | Exclude already budgeted categories from the item selector | `completada` | 2026-08-25 |
| T-0053 | Show a pinned budget total while editing items | `completada` | 2026-08-25 |
| T-0054 | Compare budgeted and actual totals on the dashboard card | `completada` | 2026-08-25 |

## Historial de cambios

| Fecha | Cambio |
| --- | --- |
| 2026-08-25 | Spec creado con status `no implementado`. |
| 2026-08-25 | Tarea T-0050 creada: Add a visual month and year picker molecule. |
| 2026-08-25 | Tarea T-0051 creada: Wire the visual month picker into the budgets view. |
| 2026-08-25 | Tarea T-0052 creada: Exclude already budgeted categories from the item selector. |
| 2026-08-25 | Tarea T-0053 creada: Show a pinned budget total while editing items. |
| 2026-08-25 | Tarea T-0054 creada: Compare budgeted and actual totals on the dashboard card. |
| 2026-08-25 | Tarea T-0050: `pendiente` → `en proceso`. |
| 2026-08-25 | Status: `no implementado` → `en proceso`. |
| 2026-08-25 | Tarea T-0050: `en proceso` → `completada`. |
| 2026-08-25 | Tarea T-0051: `pendiente` → `en proceso`. |
| 2026-08-25 | Tarea T-0051: `en proceso` → `completada`. |
| 2026-08-25 | Tarea T-0052: `pendiente` → `en proceso`. |
| 2026-08-25 | Tarea T-0052: `en proceso` → `completada`. |
| 2026-08-25 | Tarea T-0053: `pendiente` → `en proceso`. |
| 2026-08-25 | Tarea T-0053: `en proceso` → `completada`. |
| 2026-08-25 | Tarea T-0054: `pendiente` → `en proceso`. |
| 2026-08-25 | Tarea T-0054: `en proceso` → `completada`. |
