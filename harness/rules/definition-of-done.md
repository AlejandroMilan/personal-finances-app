# Definition of Done

Una tarea sólo pasa a `completada` cuando **todas** estas casillas están marcadas.
El orquestador es responsable de no saltarse ninguna.

- [ ] El código implementa exactamente el alcance del spec — ni menos, ni de más.
- [ ] Respeta `rules/project-patterns.md` (capas, ports, atomic design, tema).
- [ ] Hay tests nuevos o actualizados que cubren el comportamiento y sus casos borde.
- [ ] `pnpm test:coverage` pasa en verde con ≥ 80 % en branches, functions, lines y statements.
- [ ] `pnpm build` compila (incluye `vue-tsc --noEmit` en el frontend).
- [ ] Cada criterio de aceptación fue verificado uno por uno y marcado con `task:ac`.
- [ ] La auditoría de seguridad no dejó hallazgos abiertos de severidad alta o crítica.
- [ ] El historial del spec refleja las decisiones de diseño relevantes.
- [ ] `STATUS.md` regenerado (lo hace el CLI automáticamente).

## Severidades del auditor

| Severidad | Efecto |
| --- | --- |
| Crítica | Bloquea la tarea. Se arregla antes de completar. |
| Alta | Bloquea la tarea. |
| Media | Se registra como tarea nueva en el mismo spec o en uno de deuda técnica. |
| Baja / informativa | Se anota en el historial del spec. |
