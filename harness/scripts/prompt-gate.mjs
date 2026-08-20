#!/usr/bin/env node
/**
 * Hook `UserPromptSubmit`: inyecta en cada prompt el recordatorio del protocolo
 * spec-first y una foto del estado actual del harness.
 *
 * Falla en silencio (exit 0 sin salida) si algo va mal: un hook roto nunca debe
 * bloquear una sesión.
 */
import { config, listSpecs, loadTasks } from './lib/harness.mjs';

try {
  const store = loadTasks();
  const specs = listSpecs();

  const openTasks = store.tasks.filter((task) => task.status !== 'completada');
  const activeSpecs = specs.filter((spec) => spec.data.status !== 'implementado');

  const lines = [
    '<harness-protocol>',
    'Este repo usa el harness spec-first de `harness/`. Reglas no negociables:',
    '1. Ninguna modificación a `apps/` sin un spec y una tarea que la respalde.',
    '   Si el usuario pide un cambio y no hay spec: crea uno con',
    '   `node harness/scripts/harness.mjs spec:new "Título"` ANTES de tocar código.',
    '2. Specs y tareas se mutan SÓLO con `harness/scripts/harness.mjs` (nunca a mano).',
    '3. Sigue el pipeline de `harness/rules/workflow.md`:',
    '   orquestador → implementador → tester → validador AC → auditor de seguridad.',
    '4. Antes de implementar, lee `harness/rules/project-patterns.md`.',
    '5. Cierra siempre el ciclo: `task:ac` → `task:status … completada` → `spec:status … implementado`.',
    '',
    `Estado: ${activeSpecs.length} spec(s) activo(s), ${openTasks.length} tarea(s) abierta(s), ` +
      `${store.tasks.length}/${config.limits.maxTasks} tareas en tasks.json.`,
  ];

  if (activeSpecs.length) {
    lines.push('Specs activos:');
    for (const spec of activeSpecs.slice(0, 10)) {
      lines.push(`  - ${spec.data.id} [${spec.data.status}] ${spec.data.title}`);
    }
  }
  if (openTasks.length) {
    lines.push('Tareas abiertas:');
    for (const task of openTasks.slice(0, 10)) {
      lines.push(`  - ${task.id} [${task.status}] ${task.title} (spec ${task.spec})`);
    }
  }
  if (!activeSpecs.length && !openTasks.length) {
    lines.push('No hay trabajo en curso: cualquier petición de cambio arranca con un spec nuevo.');
  }
  lines.push('</harness-protocol>');

  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: lines.join('\n'),
      },
    })}\n`,
  );
} catch {
  process.exit(0);
}
