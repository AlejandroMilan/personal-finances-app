---
id: 0002-agenda-de-transacciones
title: Agenda de transacciones
status: en proceso
created: 2026-08-20
updated: 2026-08-20
tasks: [T-0010, T-0011, T-0012, T-0013, T-0014, T-0015, T-0016, T-0017, T-0018, T-0019, T-0020]
---

# Agenda de transacciones

## Estado

`en proceso`

## Descripción

Hoy una transacción sólo existe cuando ya ocurrió. Esta feature añade una **agenda**:
compromisos de dinero con fecha futura (la renta, la mensualidad del coche, la nómina
que entra el día 30) que el usuario apunta hoy, ve como lista de pendientes, y
**confirma manualmente** cuando de verdad ocurren. Sólo en ese momento nace la
transacción real y se mueve el saldo de la cuenta.

Comportamiento esperado:

- **Agendar**: el usuario crea una transacción agendada con los mismos datos que una
  transacción normal (título, monto, tipo ingreso/gasto, cuenta, categoría opcional,
  etiquetas) más una **fecha prevista**, que puede ser futura o pasada (para apuntar
  algo que se le olvidó). Se marca opcionalmente como **recurrente**.
- **Lista de pendientes**: una pantalla dedicada `/schedule` lista las agendadas
  ordenadas por fecha prevista, ascendente. Las que ya pasaron de fecha y siguen
  pendientes se muestran como **vencidas**, destacadas al principio. La pantalla
  permite filtrar por estado (`pendiente`, `ejecutada`, `cancelada`) para consultar el
  historial, y editar o borrar una agendada que siga pendiente.
- **Confirmar**: al confirmar, se abre un diálogo que **precarga los datos agendados
  pero permite corregirlos** (monto, fecha —hoy por defecto—, cuenta, categoría), porque
  el recibo real casi nunca coincide al céntimo con lo previsto. Al aceptar se crea una
  transacción real con esos datos, con el mismo efecto sobre el saldo que si se hubiera
  capturado a mano, y la agendada pasa a estado `ejecutada` guardando el id de la
  transacción creada. Una agendada ya ejecutada o cancelada no se puede volver a
  confirmar.
- **Recurrencia**: si la agendada está marcada como recurrente, el mismo diálogo de
  confirmación ofrece **volver a agendarla**, con un selector de fecha para la próxima,
  **por defecto un mes después de la fecha prevista de la que se está ejecutando**. Al
  aceptar se crea una nueva agendada pendiente, copia de la original salvo la fecha, y
  también marcada como recurrente. El usuario puede desmarcar la opción y cortar la
  cadena. No hay motor de recurrencia ni tarea programada: la siguiente sólo existe si
  el usuario la confirma.
- **Cancelar**: una agendada pendiente puede cancelarse; pasa a estado `cancelada`, no
  genera transacción ni saldo, y desaparece de los pendientes conservándose en el
  historial. Una cancelada no se puede confirmar después.
- **Dashboard**: la pantalla de inicio gana una **tarjeta de agenda** con las agendadas
  **vencidas** y las **del mes en curso**, agrupadas y con esas dos etiquetas. Cada fila
  permite confirmar o cancelar sin salir del dashboard, y la tarjeta enlaza a
  `/schedule`. Si no hay nada pendiente, muestra un estado vacío explícito.
- Las transacciones agendadas **no afectan saldos, ni las gráficas del dashboard, ni la
  lista de transacciones** hasta que se confirman. Son una intención, no un movimiento.

### Alcance

- Backend (`apps/backend`): módulo nuevo `scheduled-transactions`, con su propia
  colección de Mongo, siguiendo la Clean Architecture del módulo `categories`. Entidad
  `ScheduledTransaction` con el estado (`pending`/`executed`/`cancelled`) y sus
  invariantes; port `ScheduledTransactionRepository` + adaptador Mongo; casos de uso
  de crear, listar, actualizar, borrar, cancelar y ejecutar; controlador
  `scheduled-transactions` protegido con `JwtAuthGuard` y sus DTOs. El caso de uso de
  ejecución reutiliza `CreateTransactionUseCase` del módulo `transactions`; es el único
  punto de contacto entre ambos módulos. Registro del módulo en `AppModule`.
- Frontend (`apps/frontend`): `src/types/scheduled-transaction.ts`;
  `src/services/scheduled-transactions.ts`; `src/stores/scheduled-transactions.ts`;
  utilidades puras en `src/utils/schedule.ts` (vencidas, del mes en curso, fecha
  sugerida a un mes); molécula `ScheduledTransactionCard`; organismos
  `ScheduledTransactionFormDialog`, `ExecuteScheduledDialog` y `UpcomingScheduleCard`;
  vista `src/views/ScheduleView.vue` con su ruta `/schedule` (`meta.requiresAuth`) y su
  entrada en el menú de `App.vue`; la tarjeta de agenda se añade a `HomeView.vue`.

### Fuera de alcance

- Ejecución automática de transacciones agendadas: no hay cron, job ni scheduler. La
  confirmación es siempre manual, por decisión explícita del usuario.
- Motor de recurrencia real (RRULE, "cada 2 semanas", "el último viernes del mes",
  fecha de fin de la serie, número de repeticiones). La única recurrencia es la
  pregunta al confirmar, con fecha libre y un mes por defecto.
- Generar por adelantado las N próximas ocurrencias de una serie.
- Notificaciones, recordatorios, correos o push al acercarse la fecha.
- Proyección de saldo futuro, "cuánto me quedará el día 30", presupuestos o metas de
  ahorro.
- Incluir lo agendado en las gráficas de dona y de línea del dashboard, o en los
  totales del resumen de `GET /transactions/summary`.
- Convertir transacciones ya existentes en agendadas, o vincular una agendada a una
  transacción creada por fuera.
- Transferencias entre cuentas agendadas (el módulo de transacciones tampoco las tiene).
- Adjuntos, recibos o comprobantes en la agendada.
- Cambios al CRUD existente de transacciones, cuentas o categorías, más allá de reusar
  `CreateTransactionUseCase` tal cual está.

## Decisiones

| Decisión | Alternativas descartadas | Motivo |
| --- | --- | --- |
| **Colección y módulo propios** (`scheduled-transactions`) | Un flag `scheduled`/`status` sobre la colección de transacciones | Decisión del usuario: evita contaminar cada consulta, agregación y cálculo de saldo de `transactions` con un "y que no esté agendada". Los dos modelos tienen ciclos de vida distintos |
| El estado vive en la agendada (`pending`/`executed`/`cancelled`) y las ejecutadas **se conservan** | Borrar la agendada al ejecutarla | Deja historial auditable y permite responder "¿ya pagué la renta de agosto?" sin cruzar colecciones |
| Ejecutar **reutiliza `CreateTransactionUseCase`** | Duplicar la lógica de ajuste de saldo y tarjeta de crédito en el módulo nuevo | Las reglas de saldo, crédito y validación de cuenta/categoría viven en un solo sitio; el auditor rechaza reglas de negocio duplicadas |
| El diálogo de confirmación **permite ajustar** monto, fecha, cuenta y categoría | Crear la transacción tal cual se agendó | Decisión del usuario: el importe previsto y el real rara vez coinciden, y forzar una edición posterior de la transacción es peor experiencia |
| La recurrencia se resuelve **preguntando al confirmar**, con un mes por defecto | RRULE, o pre-generar ocurrencias futuras | Decisión del usuario: cubre el 90 % de los casos con una fracción de la complejidad, y nunca deja pendientes fantasma que el usuario no pidió |
| La siguiente fecha por defecto se calcula **desde la fecha prevista** de la agendada, no desde hoy | Un mes desde la fecha de confirmación | Confirmar la renta con tres días de retraso no debe correr toda la serie tres días; los meses cortos se ajustan al último día del mes destino |
| El dashboard consulta el **mismo endpoint de listado** con filtro `hasta fin de mes` | Un endpoint de resumen dedicado | El volumen de agendadas es pequeño; un endpoint extra no se paga a sí mismo |

## Tareas enlazadas

<!-- Generado por harness/scripts/harness.mjs. No editar a mano. -->

| ID | Título | Status | Implementada |
| --- | --- | --- | --- |
| T-0010 | Create the ScheduledTransaction domain entity | `completada` | 2026-08-20 |
| T-0011 | Add the ScheduledTransaction repository port and Mongo adapter | `completada` | 2026-08-20 |
| T-0012 | Add create, list, update and delete scheduled transaction use cases | `completada` | 2026-08-20 |
| T-0013 | Add cancel and execute scheduled transaction use cases | `completada` | 2026-08-20 |
| T-0014 | Expose the scheduled transactions REST endpoints | `completada` | 2026-08-20 |
| T-0015 | Add schedule types, service, store and pure utilities in the frontend | `completada` | 2026-08-20 |
| T-0016 | Build the scheduled transaction card and form dialog | `completada` | 2026-08-20 |
| T-0017 | Build the execute dialog with the reschedule question | `completada` | 2026-08-20 |
| T-0018 | Add the ScheduleView screen with its route and menu entry | `completada` | 2026-08-20 |
| T-0019 | Add the schedule card to the dashboard | `completada` | 2026-08-20 |
| T-0020 | Default the reschedule date server side | `completada` | 2026-08-20 |

## Historial de cambios

| Fecha | Cambio |
| --- | --- |
| 2026-08-20 | Spec creado con status `no implementado`. |
| 2026-08-20 | Tarea T-0010 creada: Create the ScheduledTransaction domain entity. |
| 2026-08-20 | Tarea T-0011 creada: Add the ScheduledTransaction repository port and Mongo adapter. |
| 2026-08-20 | Tarea T-0012 creada: Add create, list, update and delete scheduled transaction use cases. |
| 2026-08-20 | Tarea T-0013 creada: Add cancel and execute scheduled transaction use cases. |
| 2026-08-20 | Tarea T-0014 creada: Expose the scheduled transactions REST endpoints. |
| 2026-08-20 | Tarea T-0015 creada: Add schedule types, service, store and pure utilities in the frontend. |
| 2026-08-20 | Tarea T-0016 creada: Build the scheduled transaction card and form dialog. |
| 2026-08-20 | Tarea T-0017 creada: Build the execute dialog with the reschedule question. |
| 2026-08-20 | Tarea T-0018 creada: Add the ScheduleView screen with its route and menu entry. |
| 2026-08-20 | Tarea T-0019 creada: Add the schedule card to the dashboard. |
| 2026-08-20 | Tarea T-0010: `pendiente` → `en proceso`. |
| 2026-08-20 | Status: `no implementado` → `en proceso`. |
| 2026-08-20 | T-0010: las transiciones de estado (`markExecuted`, `cancel`) devuelven una nueva entidad en lugar de mutar, para respetar la inmutabilidad de las entidades del repo (`Category`, `Transaction`). |
| 2026-08-20 | Tarea T-0010: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0011: `pendiente` → `en proceso`. |
| 2026-08-20 | Tarea T-0011: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0012: `pendiente` → `en proceso`. |
| 2026-08-20 | T-0012: borrar una agendada tambien exige estado `pending`, para que el historial de ejecutadas y canceladas no se pueda borrar (coherente con la Descripcion). |
| 2026-08-20 | Tarea T-0012: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0013: `pendiente` → `en proceso`. |
| 2026-08-20 | Tarea T-0013: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0014: `pendiente` → `en proceso`. |
| 2026-08-20 | T-0014: `TransactionsModule` ahora exporta `CreateTransactionUseCase` para que la ejecucion de la agenda lo reutilice; es el unico acoplamiento entre ambos modulos. |
| 2026-08-20 | T-0014: auditoria de seguridad del backend de la agenda sin hallazgos altos ni criticos (todos los endpoints bajo `JwtAuthGuard`, `userId` solo desde el token, comprobacion de pertenencia en los seis casos de uso). |
| 2026-08-20 | Tarea T-0014: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0015: `pendiente` → `en proceso`. |
| 2026-08-20 | T-0015: `vitest.config.ts` mide cobertura solo sobre `src/utils/**`; ampliar el `include` habria roto el gate por archivos preexistentes sin tests, asi que el service y el store se cubren con specs propios sin tocar la config. |
| 2026-08-20 | Tarea T-0015: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0016: `pendiente` → `en proceso`. |
| 2026-08-20 | Tarea T-0016: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0017: `pendiente` → `en proceso`. |
| 2026-08-20 | Tarea T-0017: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0018: `pendiente` → `en proceso`. |
| 2026-08-20 | Tarea T-0018: `en proceso` → `completada`. |
| 2026-08-20 | Tarea T-0019: `pendiente` → `en proceso`. |
| 2026-08-20 | Tarea T-0019: `en proceso` → `completada`. |
| 2026-08-20 | T-0019: `ScheduledTransactionCard` gana el prop `compact`, que oculta editar y eliminar; el dashboard solo ofrece confirmar y cancelar y manda a `/schedule` para lo demas. |
| 2026-08-20 | Tarea T-0020 creada: Default the reschedule date server side. |
| 2026-08-20 | Tarea T-0020: `pendiente` → `en proceso`. |
| 2026-08-20 | T-0020: el endpoint de ejecucion acepta `reschedule` sin fecha y aplica el default del dominio (un mes desde la fecha prevista); `nextScheduledDate` deja de ser codigo muerto. |
| 2026-08-20 | Tarea T-0020: `en proceso` → `completada`. |
| 2026-08-20 | Auditoria de seguridad final sin hallazgos altos ni criticos: los 6 endpoints bajo `JwtAuthGuard`, `userId` siempre desde `@CurrentUser()`, pertenencia verificada en cada caso de uso y en `CreateTransactionUseCase` al ejecutar, sin secretos ni logging de datos financieros. Informativa: `findById` del repositorio no filtra por `userId` (mismo patron que `transactions` y `categories`); la comprobacion vive en los casos de uso. |
