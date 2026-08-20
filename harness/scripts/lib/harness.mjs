import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HARNESS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
export const REPO_DIR = path.resolve(HARNESS_DIR, '..');

export const config = JSON.parse(
  fs.readFileSync(path.join(HARNESS_DIR, 'config.json'), 'utf8'),
);

export const abs = (relative) => path.join(HARNESS_DIR, relative);

export const today = () => new Date().toISOString().slice(0, 10);
export const nowISO = () => new Date().toISOString();

export function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

/* ------------------------------- front matter ------------------------------ */

export function parseFrontMatter(raw) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!match) return { data: {}, body: raw };
  const data = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    data[key] =
      value.startsWith('[') && value.endsWith(']')
        ? value
            .slice(1, -1)
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : value;
  }
  return { data, body: raw.slice(match[0].length) };
}

export function stringifyFrontMatter(data, body) {
  const lines = Object.entries(data).map(([key, value]) =>
    Array.isArray(value)
      ? `${key}: [${value.join(', ')}]`
      : `${key}: ${value ?? ''}`,
  );
  return `---\n${lines.join('\n')}\n---\n\n${body.replace(/^\n+/, '')}`;
}

/* ---------------------------------- specs --------------------------------- */

export function specDirs() {
  return [abs(config.paths.specsPending), abs(config.paths.specsImplemented)];
}

export function listSpecFiles() {
  return specDirs().flatMap((dir) =>
    fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter((file) => file.endsWith('.md'))
          .map((file) => path.join(dir, file))
      : [],
  );
}

export function readSpec(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const { data, body } = parseFrontMatter(raw);
  return { file, data, body };
}

export function findSpec(id) {
  const file = listSpecFiles().find(
    (candidate) => path.basename(candidate, '.md') === id,
  );
  return file ? readSpec(file) : null;
}

export function listSpecs() {
  return listSpecFiles()
    .map(readSpec)
    .sort((a, b) => String(a.data.id).localeCompare(String(b.data.id)));
}

export function nextSpecNumber() {
  const numbers = listSpecs().map((spec) =>
    Number.parseInt(String(spec.data.id).slice(0, 4), 10),
  );
  const max = numbers.filter(Number.isFinite).reduce((a, b) => Math.max(a, b), 0);
  return String(max + 1).padStart(4, '0');
}

export function writeSpec(spec, { targetDir } = {}) {
  const dir = targetDir ?? path.dirname(spec.file);
  const destination = path.join(dir, `${spec.data.id}.md`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(destination, stringifyFrontMatter(spec.data, spec.body));
  if (path.resolve(destination) !== path.resolve(spec.file)) {
    fs.rmSync(spec.file, { force: true });
    spec.file = destination;
  }
  return spec;
}

/** Reemplaza el contenido de una sección `## <heading>` respetando el resto. */
export function replaceSection(body, heading, content) {
  const lines = body.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) {
    return `${body.trimEnd()}\n\n## ${heading}\n\n${content}\n`;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('## ')) {
      end = i;
      break;
    }
  }
  const next = [
    ...lines.slice(0, start + 1),
    '',
    ...content.split('\n'),
    '',
    ...lines.slice(end),
  ];
  return next.join('\n');
}

/** Agrega una fila al final de la tabla de "Historial de cambios". */
export function appendHistory(body, entry) {
  const heading = 'Historial de cambios';
  const row = `| ${today()} | ${entry} |`;
  const lines = body.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) {
    return `${body.trimEnd()}\n\n## ${heading}\n\n| Fecha | Cambio |\n| --- | --- |\n${row}\n`;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('## ')) {
      end = i;
      break;
    }
  }
  let lastRow = -1;
  for (let i = start + 1; i < end; i += 1) {
    if (lines[i].trim().startsWith('|')) lastRow = i;
  }
  if (lastRow === -1) {
    return replaceSection(body, heading, `| Fecha | Cambio |\n| --- | --- |\n${row}`);
  }
  lines.splice(lastRow + 1, 0, row);
  return lines.join('\n');
}

export function syncSpecTasks(spec, tasks) {
  const linked = tasks.filter((task) => task.spec === spec.data.id);
  const header = '| ID | Título | Status | Implementada |\n| --- | --- | --- | --- |';
  const rows = linked.length
    ? linked
        .map(
          (task) =>
            `| ${task.id} | ${task.title} | \`${task.status}\` | ${task.implementedAt ? task.implementedAt.slice(0, 10) : '—'} |`,
        )
        .join('\n')
    : '| — | _Sin tareas enlazadas_ | — | — |';
  spec.data.tasks = linked.map((task) => task.id);
  spec.body = replaceSection(
    spec.body,
    'Tareas enlazadas',
    `<!-- Generado por harness/scripts/harness.mjs. No editar a mano. -->\n\n${header}\n${rows}`,
  );
  return spec;
}

export function setSpecStatus(spec, status, { reason } = {}) {
  if (!config.statuses.spec.includes(status)) {
    fail(`Status de spec inválido: "${status}". Válidos: ${config.statuses.spec.join(', ')}`);
  }
  const previous = spec.data.status;
  spec.data.status = status;
  spec.data.updated = today();
  spec.body = replaceSection(spec.body, 'Estado', `\`${status}\``);
  if (previous !== status) {
    spec.body = appendHistory(
      spec.body,
      `Status: \`${previous}\` → \`${status}\`${reason ? ` (${reason})` : ''}.`,
    );
  }
  const targetDir =
    status === 'implementado'
      ? abs(config.paths.specsImplemented)
      : abs(config.paths.specsPending);
  return writeSpec(spec, { targetDir });
}

/* ---------------------------------- tasks --------------------------------- */

export function loadTasks() {
  return JSON.parse(fs.readFileSync(abs(config.paths.tasks), 'utf8'));
}

export function saveTasks(store) {
  store.updatedAt = nowISO();
  store.maxTasks = config.limits.maxTasks;
  fs.writeFileSync(
    abs(config.paths.tasks),
    `${JSON.stringify(store, null, 2)}\n`,
  );
}

export function nextTaskId(store) {
  const numbers = store.tasks.map((task) =>
    Number.parseInt(String(task.id).replace(/\D/g, ''), 10),
  );
  const max = numbers.filter(Number.isFinite).reduce((a, b) => Math.max(a, b), 0);
  return `T-${String(max + 1).padStart(4, '0')}`;
}

/**
 * Mantiene tasks.json dentro del límite configurado moviendo las tareas
 * completadas más antiguas a un archivo JSONL fuera de git.
 */
export function enforceTaskLimit(store) {
  const limit = config.limits.maxTasks;
  const excess = store.tasks.length - limit;
  if (excess <= 0) return [];

  const completed = store.tasks
    .filter((task) => task.status === 'completada')
    .sort((a, b) =>
      String(a.implementedAt ?? a.createdAt).localeCompare(
        String(b.implementedAt ?? b.createdAt),
      ),
    );

  const archived = completed.slice(0, excess);
  if (archived.length < excess) {
    console.warn(
      `⚠ Límite de ${limit} tareas superado y solo hay ${completed.length} completadas para archivar. Cierra o elimina tareas abiertas.`,
    );
  }
  if (!archived.length) return [];

  const archiveFile = abs(config.limits.archiveFile);
  fs.mkdirSync(path.dirname(archiveFile), { recursive: true });
  fs.appendFileSync(
    archiveFile,
    `${archived.map((task) => JSON.stringify(task)).join('\n')}\n`,
  );
  const archivedIds = new Set(archived.map((task) => task.id));
  store.tasks = store.tasks.filter((task) => !archivedIds.has(task.id));
  return archived;
}

/* --------------------------------- status --------------------------------- */

export function renderStatus(store, specs) {
  const count = (status) =>
    store.tasks.filter((task) => task.status === status).length;
  const bySpecStatus = (status) =>
    specs.filter((spec) => spec.data.status === status);

  const total = store.tasks.length;
  const done = count('completada');
  const pct = total ? Math.round((done / total) * 100) : 0;
  const bar = `${'█'.repeat(Math.round(pct / 5))}${'░'.repeat(20 - Math.round(pct / 5))}`;

  const openTasks = store.tasks
    .filter((task) => task.status !== 'completada')
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const lines = [];
  lines.push('# Estado del harness');
  lines.push('');
  lines.push('> Archivo generado automáticamente por `harness/scripts/harness.mjs`.');
  lines.push('> Se regenera cada vez que una tarea cambia de status. No editar a mano.');
  lines.push('');
  lines.push(`**Última actualización:** ${nowISO()}`);
  lines.push('');
  lines.push('## Progreso');
  lines.push('');
  lines.push(`\`${bar}\` ${pct}% (${done}/${total} tareas completadas)`);
  lines.push('');
  lines.push('## Tareas');
  lines.push('');
  lines.push('| Status | Cantidad |');
  lines.push('| --- | --- |');
  for (const status of config.statuses.task) {
    lines.push(`| \`${status}\` | ${count(status)} |`);
  }
  lines.push(`| **Total en \`tasks.json\`** | **${total} / ${config.limits.maxTasks}** |`);
  lines.push('');
  lines.push('## Specs');
  lines.push('');
  lines.push('| Status | Cantidad | Ubicación |');
  lines.push('| --- | --- | --- |');
  lines.push(
    `| \`no implementado\` | ${bySpecStatus('no implementado').length} | \`${config.paths.specsPending}/\` |`,
  );
  lines.push(
    `| \`en proceso\` | ${bySpecStatus('en proceso').length} | \`${config.paths.specsPending}/\` |`,
  );
  lines.push(
    `| \`implementado\` | ${bySpecStatus('implementado').length} | \`${config.paths.specsImplemented}/\` (fuera de git) |`,
  );
  lines.push('');
  lines.push('## Trabajo abierto');
  lines.push('');
  if (openTasks.length) {
    lines.push('| Tarea | Título | Status | Spec | Creada |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const task of openTasks) {
      lines.push(
        `| ${task.id} | ${task.title} | \`${task.status}\` | \`${task.spec}\` | ${task.createdAt.slice(0, 10)} |`,
      );
    }
  } else {
    lines.push('_No hay tareas abiertas._');
  }
  lines.push('');
  lines.push('## Specs activos');
  lines.push('');
  const activeSpecs = specs.filter((spec) => spec.data.status !== 'implementado');
  if (activeSpecs.length) {
    lines.push('| Spec | Título | Status | Tareas |');
    lines.push('| --- | --- | --- | --- |');
    for (const spec of activeSpecs) {
      lines.push(
        `| [\`${spec.data.id}\`](${config.paths.specsPending}/${spec.data.id}.md) | ${spec.data.title} | \`${spec.data.status}\` | ${(spec.data.tasks ?? []).length} |`,
      );
    }
  } else {
    lines.push('_No hay specs activos._');
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

/** Regenera STATUS.md y la tabla de tareas de cada spec. */
export function refresh(store = loadTasks()) {
  const specs = listSpecs();
  for (const spec of specs) {
    const before = stringifyFrontMatter(spec.data, spec.body);
    syncSpecTasks(spec, store.tasks);
    if (stringifyFrontMatter(spec.data, spec.body) !== before) writeSpec(spec);
  }
  fs.writeFileSync(abs(config.paths.status), renderStatus(store, specs));
  return { store, specs };
}
