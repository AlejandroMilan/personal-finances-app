# Harness spec-first

Proceso de desarrollo asistido por agentes para este monorepo: **ningún cambio en
`apps/` entra sin un spec y una tarea que lo respalden**, y ninguna tarea se cierra sin
tests, validación de criterios de aceptación y auditoría de seguridad.

## Estructura

```
harness/
├── README.md                 Este archivo
├── config.json               Límites, rutas, statuses y compuertas
├── STATUS.md                 Estado actual (autogenerado en cada cambio de tarea)
├── tasks.json                Tareas activas (máx. 100; el resto se archiva)
├── specs/
│   ├── TEMPLATE.md           Plantilla de spec
│   ├── pending/              Specs `no implementado` y `en proceso`  → versionados
│   └── implemented/          Specs `implementado`                    → fuera de git
├── archive/                  Tareas completadas rotadas fuera de tasks.json (fuera de git)
├── agents/                   Mandato y reglas de cada rol
│   ├── orchestrator.md
│   ├── implementer.md
│   ├── tester.md
│   ├── acceptance-validator.md
│   └── security-auditor.md
├── rules/
│   ├── workflow.md           Regla maestra spec-first y ciclo de vida
│   ├── spec-format.md        Formato y secciones de un spec
│   ├── project-patterns.md   Arquitectura y antipatrones del proyecto
│   └── definition-of-done.md Checklist de cierre
└── scripts/
    ├── harness.mjs           CLI (única vía para mutar specs, tareas y STATUS.md)
    ├── prompt-gate.mjs       Hook UserPromptSubmit: recuerda el protocolo en cada prompt
    ├── change-gate.mjs       Hook PreToolUse: bloquea escrituras en apps/ sin tarea activa
    └── lib/harness.mjs       Lógica compartida
```

Fuera de `harness/` sólo hay punteros finos, en las rutas que Claude Code exige:

- `.claude/skills/harness/SKILL.md` — el skill que activa el protocolo.
- `.claude/agents/harness-*.md` — los cuatro subagentes; cada uno lee sus reglas de `harness/agents/`.
- `.claude/settings.json` — registro de los dos hooks.

## Uso

```bash
H="node harness/scripts/harness.mjs"

$H spec:new "Presupuestos mensuales" --desc "..."          # crea specs/pending/0001-...
$H task:add --spec 0001-presupuestos-mensuales \
    --title "Entidad Budget" --ac "criterio verificable"   # crea T-0001
$H task:status T-0001 "en proceso"                         # el spec pasa a `en proceso`
$H task:ac T-0001 AC-1 --note "budget.entity.ts:24"        # valida un criterio
$H task:status T-0001 "completada"                         # exige todos los AC validados
$H spec:status 0001-presupuestos-mensuales "implementado"  # exige cero tareas abiertas
$H task:list [--status <s>] [--spec <id>]
$H status                                                  # regenera STATUS.md
$H check                                                   # valida integridad
```

`$H --help` lista todo.

## Compuertas automáticas

| Compuerta | Cómo actúa |
| --- | --- |
| Toda tarea nace de un spec vivo | `task:add` falla si el spec no existe o ya está implementado |
| Toda tarea tiene criterios de aceptación | `task:add` exige al menos un `--ac` |
| No se completa sin validar criterios | `task:status … completada` falla con AC pendientes |
| No se cierra un spec con trabajo abierto | `spec:status … implementado` falla |
| Specs implementados fuera de git | `spec:status` los mueve a `specs/implemented/` (ignorado) |
| Máx. 100 tareas en `tasks.json` | Las completadas más antiguas rotan a `archive/tasks-archive.jsonl` |
| `STATUS.md` siempre al día | Se regenera en cada mutación |
| Sin tarea activa no se escribe en `apps/` | Hook `PreToolUse` (`change-gate.mjs`); bypass consciente con `HARNESS_BYPASS=1` |
| El protocolo se recuerda en cada prompt | Hook `UserPromptSubmit` (`prompt-gate.mjs`) |

## Ajustes

Todo lo configurable vive en `config.json`: `limits.maxTasks` (100), umbral de
cobertura, statuses válidos, rutas y qué compuertas están activas.
