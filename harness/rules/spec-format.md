# Formato de spec

Un spec es un archivo Markdown con front matter, creado siempre con
`node harness/scripts/harness.mjs spec:new "Título"` (nunca a mano: el ID se autoincrementa).

```markdown
---
id: 0007-presupuestos-mensuales      # NNNN-slug, inmutable
title: Presupuestos mensuales        # legible por humanos
status: no implementado              # no implementado | en proceso | implementado
created: 2026-08-20
updated: 2026-08-20
tasks: [T-0012, T-0013]              # generado; no editar a mano
---
```

## Secciones obligatorias

| Sección | Quién la escribe | Contenido |
| --- | --- | --- |
| `## Estado` | CLI | Espejo del `status` del front matter |
| `## Descripción` | orquestador (con el usuario) | Qué, por qué, alcance por app, fuera de alcance |
| `## Tareas enlazadas` | CLI | Tabla autogenerada; **no editar a mano** |
| `## Historial de cambios` | CLI + agentes | Una fila por evento, en orden cronológico |

Se pueden añadir secciones extra (`## Diseño técnico`, `## Riesgos`, `## Decisiones`)
después de `## Descripción`. Los agentes deben respetarlas al reescribir.

## Reglas de escritura

- **Descripción**: en español, en términos de comportamiento observable, no de
  implementación. Di *"el usuario puede fijar un tope mensual por categoría"*, no
  *"crear BudgetSchema con mongoose"*.
- **Alcance**: enumera explícitamente qué módulos de `apps/backend` y qué componentes
  de `apps/frontend` se tocan. Si una app no se toca, escribe `ninguno`.
- **Fuera de alcance**: obligatorio y no vacío. Es lo que evita que el implementador
  se expanda por su cuenta.
- **Historial**: el CLI añade filas automáticamente en cada cambio de status y alta de
  tarea. Si un agente toma una decisión de diseño relevante, añade una fila manual.

## Un spec por unidad de valor

Un spec cubre un cambio coherente de cara al usuario. Si al desglosarlo salen más de
~8 tareas, pártelo en varios specs.
