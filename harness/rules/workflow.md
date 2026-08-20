# Regla maestra: spec-first

**Ninguna modificación al código entra sin un spec.** No hay excepciones por tamaño:
un typo, un rename o un `console.log` también requieren spec y tarea. Si algo parece
demasiado pequeño para un spec, sigue necesitando uno — será un spec de una tarea.

Única excepción: cambios dentro de `harness/` mismo (meta-mantenimiento del proceso).

## Ciclo de vida

```
petición del usuario
        │
        ▼
 [orquestador] ── spec:new ──▶ specs/pending/NNNN-slug.md   (status: no implementado)
        │
        ├── task:add --spec … --ac … (1..N tareas con criterios de aceptación)
        │
        ▼
 por cada tarea:
   [orquestador] task:status <id> "en proceso"   → el spec pasa a `en proceso`
        │
        ├─▶ [implementador]  escribe el código siguiendo rules/project-patterns.md
        ├─▶ [tester]         escribe/ejecuta tests (cobertura ≥ 80 %)
        ├─▶ [validador AC]   verifica criterio por criterio → task:ac <id> AC-n
        ├─▶ [auditor seg.]   revisa authz, validación, secretos, datos financieros
        │
        ▼
   [orquestador] task:status <id> "completada"   → STATUS.md se regenera
        │
        ▼
 cuando no quedan tareas abiertas del spec:
   [orquestador] spec:status <specId> "implementado"
        → el archivo se mueve a specs/implemented/ (fuera de git)
```

## Invariantes que el harness hace cumplir por código

| Invariante | Dónde |
| --- | --- |
| Toda tarea apunta a un spec existente y no implementado | `task:add` |
| Toda tarea tiene ≥ 1 criterio de aceptación | `task:add` |
| Una tarea no se completa con criterios sin validar | `task:status` |
| Un spec no se marca implementado con tareas abiertas | `spec:status` |
| Los specs implementados viven fuera de git | `.gitignore` + `spec:status` |
| `tasks.json` nunca excede 100 tareas | `enforceTaskLimit` |
| `STATUS.md` refleja el estado real | `refresh()` en cada mutación |

## Cuando el usuario pide algo sin spec

1. No toques el código.
2. Crea el spec (`spec:new`) y muestra el resumen al usuario.
3. Desglosa en tareas con criterios de aceptación verificables.
4. Recién entonces arranca el ciclo de implementación.

Si el usuario insiste en saltarse el spec, díselo una vez y, si lo reafirma, crea el
spec retroactivamente **antes** de tocar el código: el spec es el registro, no un trámite.

## Bloqueos

Si una tarea no puede avanzar (dependencia externa, decisión de producto pendiente),
márcala `bloqueada` con `--reason` y sigue con otra. Nunca la dejes silenciosamente
`en proceso`.
