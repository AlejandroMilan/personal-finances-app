---
id: 0009-gestion-de-deudas
title: Gestión de deudas
status: en proceso
created: 2026-10-25
updated: 2026-10-25
tasks: [T-0055, T-0056, T-0057, T-0058, T-0059, T-0060, T-0061, T-0062]
---

# Gestión de deudas

## Estado

`en proceso`

## Descripción

Módulo de deudas: registro de deudas (nombre, adeudo total, revolvente, interés anual opcional y modo de descuento de pagos), vinculación de gastos a pagos de deuda (capital + interés) e ingresos a aumentos de deuda (monto + interés), misma vinculación en la agenda, log general y por deuda, gráfica de evolución y gráfica de pastel del total adeudado en la vista de Deudas y en el dashboard.

### Alcance

- Backend (`apps/backend`): <!-- módulos/capas afectadas o "ninguno" -->
- Frontend (`apps/frontend`): <!-- componentes/stores/vistas afectadas o "ninguno" -->

### Fuera de alcance

-

## Tareas enlazadas

<!-- Generado por harness/scripts/harness.mjs. No editar a mano. -->

| ID | Título | Status | Implementada |
| --- | --- | --- | --- |
| T-0055 | Debts backend module: CRUD and movement log | `completada` | 2026-10-25 |
| T-0056 | Link transactions to debt payments and debt increases | `completada` | 2026-10-25 |
| T-0057 | Link scheduled transactions to debts | `completada` | 2026-10-25 |
| T-0058 | Frontend debts domain: types, service, store and pure utils | `completada` | 2026-10-25 |
| T-0059 | Debts view: list, form, ledgers and charts | `completada` | 2026-10-25 |
| T-0060 | Debt fields in transaction and scheduled forms | `completada` | 2026-10-25 |
| T-0061 | Debt charts on the dashboard | `completada` | 2026-10-25 |
| T-0062 | Build, container verification and deployment readiness | `bloqueada` | — |

## Historial de cambios

| Fecha | Cambio |
| --- | --- |
| 2026-10-25 | Spec creado con status `no implementado`. |
| 2026-10-25 | Tarea T-0055 creada: Debts backend module: CRUD and movement log. |
| 2026-10-25 | Tarea T-0056 creada: Link transactions to debt payments and debt increases. |
| 2026-10-25 | Tarea T-0057 creada: Link scheduled transactions to debts. |
| 2026-10-25 | Tarea T-0058 creada: Frontend debts domain: types, service, store and pure utils. |
| 2026-10-25 | Tarea T-0059 creada: Debts view: list, form, ledgers and charts. |
| 2026-10-25 | Tarea T-0060 creada: Debt fields in transaction and scheduled forms. |
| 2026-10-25 | Tarea T-0061 creada: Debt charts on the dashboard. |
| 2026-10-25 | Tarea T-0062 creada: Build, container verification and deployment readiness. |
| 2026-10-25 | Tarea T-0055: `pendiente` → `en proceso`. |
| 2026-10-25 | Status: `no implementado` → `en proceso`. |
| 2026-10-25 | Tarea T-0055: `en proceso` → `completada`. |
| 2026-10-25 | Tarea T-0056: `pendiente` → `en proceso`. |
| 2026-10-25 | Tarea T-0056: `en proceso` → `completada`. |
| 2026-10-25 | Tarea T-0057: `pendiente` → `en proceso`. |
| 2026-10-25 | Tarea T-0057: `en proceso` → `completada`. |
| 2026-10-25 | Tarea T-0058: `pendiente` → `en proceso`. |
| 2026-10-25 | Tarea T-0058: `en proceso` → `completada`. |
| 2026-10-25 | Tarea T-0059: `pendiente` → `en proceso`. |
| 2026-10-25 | Tarea T-0059: `en proceso` → `completada`. |
| 2026-10-25 | Tarea T-0060: `pendiente` → `en proceso`. |
| 2026-10-25 | Tarea T-0060: `en proceso` → `completada`. |
| 2026-10-25 | Tarea T-0061: `pendiente` → `en proceso`. |
| 2026-10-25 | Tarea T-0061: `en proceso` → `completada`. |
| 2026-10-25 | Tarea T-0062: `pendiente` → `en proceso`. |
| 2026-10-25 | Tarea T-0062: `en proceso` → `bloqueada` (Despliegue a entorno real pendiente: falta el destino (proveedor, MONGODB_URI de producción y dominio). Imágenes de backend y frontend ya construyen y pasan tests.). |
