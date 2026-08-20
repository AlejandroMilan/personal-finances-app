#!/usr/bin/env node
/**
 * Hook `PreToolUse` (Edit|Write|MultiEdit|NotebookEdit): bloquea cualquier escritura
 * en `apps/` si no hay una tarea del harness `en proceso`.
 *
 * Escape hatch consciente: `HARNESS_BYPASS=1`.
 * Falla abierto: si el harness no se puede leer, deja pasar el cambio.
 */
import path from 'node:path';
import { REPO_DIR, loadTasks } from './lib/harness.mjs';

const GUARDED = ['apps'];

const deny = (reason) => {
  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })}\n`,
  );
  process.exit(0);
};

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return chunks.join('');
};

try {
  if (process.env.HARNESS_BYPASS === '1') process.exit(0);

  const payload = JSON.parse((await readStdin()) || '{}');
  const filePath = payload?.tool_input?.file_path ?? payload?.tool_input?.notebook_path;
  if (!filePath) process.exit(0);

  const relative = path.relative(REPO_DIR, path.resolve(REPO_DIR, filePath));
  const guarded = GUARDED.some(
    (dir) => relative === dir || relative.startsWith(`${dir}${path.sep}`),
  );
  if (!guarded || relative.startsWith('..')) process.exit(0);

  const store = loadTasks();
  const active = store.tasks.filter((task) => task.status === 'en proceso');
  if (!active.length) {
    deny(
      [
        `Bloqueado por el harness: no hay ninguna tarea "en proceso", así que ${relative} no puede modificarse.`,
        '',
        'Protocolo spec-first (harness/rules/workflow.md):',
        '  1. node harness/scripts/harness.mjs spec:new "Título"',
        '  2. node harness/scripts/harness.mjs task:add --spec <specId> --title "..." --ac "..."',
        '  3. node harness/scripts/harness.mjs task:status <taskId> "en proceso"',
        '',
        'Después de eso, reintenta la edición.',
      ].join('\n'),
    );
  }
  process.exit(0);
} catch {
  process.exit(0);
}
