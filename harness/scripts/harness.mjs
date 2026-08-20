#!/usr/bin/env node
/**
 * CLI del harness: única vía soportada para crear/mover specs y tareas.
 *
 *   node harness/scripts/harness.mjs <comando> [opciones]
 *
 * Comandos:
 *   spec:new "Título" [--desc "..."]            Crea un spec en specs/pending
 *   spec:status <specId> <status> [--reason]    Cambia status y reubica el archivo
 *   spec:show <specId>                          Imprime el spec
 *   task:add --spec <specId> --title "..."      Crea una tarea enlazada a un spec
 *            [--desc "..."] [--ac "criterio"]*
 *   task:status <taskId> <status> [--reason]    Cambia status de la tarea
 *   task:list [--status <status>] [--spec <id>] Lista tareas
 *   status                                      Regenera STATUS.md
 *   check                                       Valida la integridad del harness
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  HARNESS_DIR,
  abs,
  appendHistory,
  config,
  enforceTaskLimit,
  fail,
  findSpec,
  listSpecs,
  loadTasks,
  nextSpecNumber,
  nextTaskId,
  nowISO,
  refresh,
  saveTasks,
  setSpecStatus,
  slugify,
  today,
  writeSpec,
} from './lib/harness.mjs';

/* --------------------------------- parseo --------------------------------- */

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    if (key in flags) flags[key] = [].concat(flags[key], value);
    else flags[key] = value;
  }
  return { positional, flags };
}

const asList = (value) => (value === undefined ? [] : [].concat(value));

/* -------------------------------- comandos -------------------------------- */

function specNew({ positional, flags }) {
  const title = positional[0] ?? flags.title;
  if (!title || title === true) fail('Falta el título: spec:new "Título del spec"');

  const id = `${nextSpecNumber()}-${slugify(title)}`;
  const template = fs.readFileSync(abs(config.paths.specTemplate), 'utf8');
  const content = template
    .replaceAll('{{id}}', id)
    .replaceAll('{{title}}', title)
    .replaceAll('{{date}}', today());

  const file = path.join(abs(config.paths.specsPending), `${id}.md`);
  if (fs.existsSync(file)) fail(`El spec ${id} ya existe.`);
  fs.writeFileSync(file, content);

  if (typeof flags.desc === 'string') {
    const spec = findSpec(id);
    spec.body = spec.body.replace(
      /(## Descripción\n\n)([\s\S]*?)(?=\n### Alcance)/,
      `$1${flags.desc}\n`,
    );
    writeSpec(spec);
  }

  refresh();
  console.log(`✔ Spec creado: harness/${config.paths.specsPending}/${id}.md`);
  console.log(`  Siguiente paso: completar Descripción y crear tareas con task:add --spec ${id}`);
}

function specStatus({ positional, flags }) {
  const [id, status] = positional;
  if (!id || !status) fail('Uso: spec:status <specId> "<status>"');
  const spec = findSpec(id);
  if (!spec) fail(`No existe el spec "${id}".`);

  const store = loadTasks();
  const open = store.tasks.filter(
    (task) => task.spec === id && task.status !== 'completada',
  );
  if (status === 'implementado' && open.length) {
    fail(
      `No se puede marcar "${id}" como implementado: ${open.length} tarea(s) abiertas (${open
        .map((task) => task.id)
        .join(', ')}).`,
    );
  }

  setSpecStatus(spec, status, {
    reason: typeof flags.reason === 'string' ? flags.reason : undefined,
  });
  refresh(store);
  console.log(`✔ Spec ${id} → \`${status}\` (${path.relative(HARNESS_DIR, spec.file)})`);
  if (status === 'implementado') {
    console.log('  El archivo vive ahora fuera de git (specs/implemented está en .gitignore).');
  }
}

function specShow({ positional }) {
  const spec = findSpec(positional[0]);
  if (!spec) fail(`No existe el spec "${positional[0]}".`);
  console.log(fs.readFileSync(spec.file, 'utf8'));
}

function taskAdd({ flags }) {
  const specId = flags.spec;
  const title = flags.title;
  if (typeof specId !== 'string') fail('Falta --spec <specId>. Toda tarea debe nacer de un spec.');
  if (typeof title !== 'string') fail('Falta --title "..."');

  const spec = findSpec(specId);
  if (!spec) fail(`No existe el spec "${specId}".`);
  if (spec.data.status === 'implementado') {
    fail(`El spec "${specId}" ya está implementado. Crea un spec nuevo para cambios adicionales.`);
  }

  const criteria = asList(flags.ac).filter((item) => typeof item === 'string');
  if (!criteria.length) fail('Se requiere al menos un criterio de aceptación (--ac "...").');

  const store = loadTasks();
  const task = {
    id: nextTaskId(store),
    title,
    description: typeof flags.desc === 'string' ? flags.desc : '',
    status: 'pendiente',
    createdAt: nowISO(),
    implementedAt: null,
    acceptanceCriteria: criteria.map((text, index) => ({
      id: `AC-${index + 1}`,
      text,
      validated: false,
    })),
    spec: specId,
  };

  store.tasks.push(task);
  const archived = enforceTaskLimit(store);
  saveTasks(store);

  const freshSpec = findSpec(specId);
  freshSpec.body = appendHistory(freshSpec.body, `Tarea ${task.id} creada: ${title}.`);
  freshSpec.data.updated = today();
  writeSpec(freshSpec);

  refresh(store);
  if (archived.length) {
    console.log(`ℹ ${archived.length} tarea(s) completadas archivadas en ${config.limits.archiveFile}`);
  }
  console.log(`✔ Tarea ${task.id} creada y enlazada al spec ${specId}.`);
}

function taskStatus({ positional, flags }) {
  const [id, status] = positional;
  if (!id || !status) fail('Uso: task:status <taskId> "<status>"');
  if (!config.statuses.task.includes(status)) {
    fail(`Status inválido: "${status}". Válidos: ${config.statuses.task.join(', ')}`);
  }

  const store = loadTasks();
  const task = store.tasks.find((item) => item.id === id);
  if (!task) fail(`No existe la tarea "${id}".`);

  if (status === 'completada') {
    const pending = task.acceptanceCriteria.filter((criterion) => !criterion.validated);
    if (config.gates.requireAcceptanceValidation && pending.length) {
      fail(
        `No se puede completar ${id}: criterios sin validar (${pending
          .map((criterion) => criterion.id)
          .join(', ')}). El validador debe marcarlos con task:ac.`,
      );
    }
  }

  const previous = task.status;
  task.status = status;
  task.implementedAt = status === 'completada' ? nowISO() : null;

  const archived = enforceTaskLimit(store);
  saveTasks(store);

  const spec = findSpec(task.spec);
  if (spec) {
    spec.body = appendHistory(
      spec.body,
      `Tarea ${task.id}: \`${previous}\` → \`${status}\`${
        typeof flags.reason === 'string' ? ` (${flags.reason})` : ''
      }.`,
    );
    spec.data.updated = today();
    const specStatusNext =
      status === 'en proceso' && spec.data.status === 'no implementado'
        ? 'en proceso'
        : null;
    writeSpec(spec);
    if (specStatusNext) setSpecStatus(findSpec(task.spec), specStatusNext);
  }

  refresh(store);
  if (archived.length) {
    console.log(`ℹ ${archived.length} tarea(s) archivadas en ${config.limits.archiveFile}`);
  }
  console.log(`✔ Tarea ${id}: \`${previous}\` → \`${status}\`. STATUS.md regenerado.`);

  const remaining = store.tasks.filter(
    (item) => item.spec === task.spec && item.status !== 'completada',
  );
  if (status === 'completada' && !remaining.length) {
    console.log(
      `→ El spec ${task.spec} no tiene tareas abiertas. Márcalo con: spec:status ${task.spec} "implementado"`,
    );
  }
}

function taskAc({ positional, flags }) {
  const [taskId, acId] = positional;
  if (!taskId || !acId) fail('Uso: task:ac <taskId> <AC-n> [--fail] [--note "..."]');
  const store = loadTasks();
  const task = store.tasks.find((item) => item.id === taskId);
  if (!task) fail(`No existe la tarea "${taskId}".`);
  const criterion = task.acceptanceCriteria.find((item) => item.id === acId);
  if (!criterion) fail(`No existe el criterio "${acId}" en ${taskId}.`);

  criterion.validated = flags.fail !== true;
  criterion.validatedAt = nowISO();
  if (typeof flags.note === 'string') criterion.note = flags.note;

  saveTasks(store);
  refresh(store);
  console.log(`✔ ${taskId}/${acId} → ${criterion.validated ? 'validado' : 'NO validado'}`);
}

function taskList({ flags }) {
  const store = loadTasks();
  const rows = store.tasks.filter(
    (task) =>
      (typeof flags.status !== 'string' || task.status === flags.status) &&
      (typeof flags.spec !== 'string' || task.spec === flags.spec),
  );
  if (!rows.length) return console.log('Sin tareas que coincidan.');
  for (const task of rows) {
    const validated = task.acceptanceCriteria.filter((item) => item.validated).length;
    console.log(
      `${task.id}  [${task.status.padEnd(11)}]  ${task.title}  (spec: ${task.spec}, AC ${validated}/${task.acceptanceCriteria.length})`,
    );
  }
}

function check() {
  const store = loadTasks();
  const specs = listSpecs();
  const specIds = new Set(specs.map((spec) => String(spec.data.id)));
  const problems = [];

  if (store.tasks.length > config.limits.maxTasks) {
    problems.push(`tasks.json excede el límite (${store.tasks.length}/${config.limits.maxTasks}).`);
  }
  for (const task of store.tasks) {
    if (!specIds.has(task.spec)) problems.push(`${task.id} apunta a un spec inexistente: ${task.spec}`);
    if (!config.statuses.task.includes(task.status)) problems.push(`${task.id} tiene status inválido: ${task.status}`);
    if (!task.acceptanceCriteria?.length) problems.push(`${task.id} no tiene criterios de aceptación.`);
    if (task.status === 'completada' && !task.implementedAt) problems.push(`${task.id} está completada sin fecha de implementación.`);
  }
  for (const spec of specs) {
    if (!config.statuses.spec.includes(spec.data.status)) {
      problems.push(`${spec.data.id} tiene status inválido: ${spec.data.status}`);
    }
    const inImplementedDir = spec.file.includes(`${path.sep}implemented${path.sep}`);
    if ((spec.data.status === 'implementado') !== inImplementedDir) {
      problems.push(`${spec.data.id} está en el directorio equivocado para su status.`);
    }
  }

  refresh(store);
  if (problems.length) {
    for (const problem of problems) console.error(`✖ ${problem}`);
    process.exit(1);
  }
  console.log(`✔ Harness consistente: ${specs.length} spec(s), ${store.tasks.length} tarea(s).`);
}

/* --------------------------------- runner --------------------------------- */

const commands = {
  'spec:new': specNew,
  'spec:status': specStatus,
  'spec:show': specShow,
  'task:add': taskAdd,
  'task:status': taskStatus,
  'task:ac': taskAc,
  'task:list': taskList,
  check,
  status: () => {
    refresh();
    console.log('✔ STATUS.md regenerado.');
  },
};

const [command, ...rest] = process.argv.slice(2);
if (!command || command === '--help' || command === '-h') {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n/, ''));
  process.exit(0);
}
if (!commands[command]) fail(`Comando desconocido: ${command}. Usa --help.`);
commands[command](parseArgs(rest));
