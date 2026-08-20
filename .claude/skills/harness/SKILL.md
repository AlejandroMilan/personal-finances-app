---
name: harness
description: Protocolo spec-first de este repo. Úsalo SIEMPRE que la petición implique leer, planear o modificar código en apps/ (features, fixes, refactors, tests), o cuando se hable de specs, tareas, STATUS.md o del harness. Crea el spec y las tareas, y coordina implementador, tester, validador de criterios y auditor de seguridad.
---

# Harness spec-first

Toda modificación al código de este repo pasa por un spec y una tarea. El harness vive
en `harness/`; su CLI es la única vía para crear o mutar specs, tareas y `STATUS.md`.

```bash
H="node harness/scripts/harness.mjs"
```

## Paso 0 — Clasifica la petición

| Petición | Acción |
| --- | --- |
| Cambio en `apps/` (feature, fix, refactor, test, config) | Protocolo completo, empezando por el spec |
| Continuar trabajo ya especificado | Localiza el spec/tarea con `$H task:list` y retoma el pipeline |
| Sólo preguntas / lectura / explicación | Responde; no crees spec |
| Cambios dentro de `harness/` | Exento del protocolo |

Si hay duda, **crea el spec**. Es barato; un cambio sin registro no lo es.

## Paso 1 — Spec (rol: orquestador)

Lee `harness/agents/orchestrator.md` y `harness/rules/spec-format.md`.

```bash
$H spec:new "Título del cambio" --desc "Qué y por qué, en términos de comportamiento"
```

Luego edita el spec en `harness/specs/pending/NNNN-slug.md` para completar **Alcance**
(backend / frontend) y **Fuera de alcance** (obligatorio, no vacío). No toques las
secciones autogeneradas.

## Paso 2 — Tareas

Desglosa en tareas pequeñas. Cada una necesita ≥ 1 criterio de aceptación verificable
por un tercero, más uno de calidad medible.

```bash
$H task:add --spec 0007-slug \
  --title "Crear entidad Budget" \
  --desc "Entidad de dominio con sus invariantes" \
  --ac "Budget.create rechaza amount <= 0 con DomainError" \
  --ac "pnpm test:coverage pasa con >= 80% en el módulo budgets"
```

Presenta el plan (spec + tareas) al usuario antes de implementar.

## Paso 3 — Pipeline por tarea

```bash
$H task:status T-0012 "en proceso"
```

Ejecuta los cuatro roles **en orden**, cada uno con su archivo de reglas. Puedes
asumir el rol tú mismo leyendo su archivo, o delegarlo al subagente correspondiente
(`harness-implementer`, `harness-tester`, `harness-acceptance-validator`,
`harness-security-auditor`).

| Orden | Rol | Reglas | Entrega |
| --- | --- | --- | --- |
| 1 | Implementador | `harness/agents/implementer.md` + `harness/rules/project-patterns.md` | Código en el patrón del módulo vecino |
| 2 | Tester | `harness/agents/tester.md` | Tests + `pnpm test:coverage` en verde ≥ 80 % |
| 3 | Validador AC | `harness/agents/acceptance-validator.md` | Un veredicto con evidencia por criterio |
| 4 | Auditor de seguridad | `harness/agents/security-auditor.md` | Hallazgos con severidad, o "sin hallazgos" |

El validador marca cada criterio:

```bash
$H task:ac T-0012 AC-1 --note "budget.entity.ts:24 + test 'rejects non positive amount'"
$H task:ac T-0012 AC-2 --fail --note "cobertura de branches en 71%"
```

Hallazgos críticos o altos del auditor **bloquean**: vuelven al implementador.

## Paso 4 — Cierre

```bash
$H task:status T-0012 "completada"     # exige todos los AC validados; regenera STATUS.md
$H spec:status 0007-slug "implementado" # exige cero tareas abiertas; saca el spec de git
$H check                                # integridad del harness
```

Verifica contra `harness/rules/definition-of-done.md` antes de completar.

## Reglas que no se negocian

- Nunca edites a mano `harness/tasks.json`, `harness/STATUS.md`, el front matter de un
  spec ni su tabla de tareas enlazadas. Usa el CLI.
- Nunca implementes fuera del alcance del spec: abre otra tarea u otro spec.
- Nunca bajes el umbral de cobertura ni excluyas archivos para pasar la barra.
- Nunca completes una tarea con criterios sin validar (el CLI lo impide; no lo rodees).
- Un spec `implementado` es inmutable: cambios posteriores requieren un spec nuevo.
- Si el usuario pide saltarse el spec, dilo una vez; si lo reafirma, crea el spec igual
  y sigue — es el registro del cambio, no burocracia.

## Referencia rápida

```bash
$H --help                     # todos los comandos
$H task:list --status pendiente
$H spec:show 0007-slug
$H status                     # regenera STATUS.md
```
