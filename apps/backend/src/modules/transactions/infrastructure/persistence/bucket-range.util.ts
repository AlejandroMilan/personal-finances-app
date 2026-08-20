import { SummaryGranularity } from '../../application/ports/transaction.repository';

/**
 * Utilidades de calendario para las series temporales del resumen.
 *
 * Los buckets se alinean con el calendario de una zona IANA (no con UTC) para que
 * "el día 5" del dashboard sea el día 5 del usuario y no un tramo desplazado por
 * su offset. Se apoyan en `Intl` para no añadir una dependencia de fechas.
 */

const MS_PER_SECOND = 1000;

const formatters = new Map<string, Intl.DateTimeFormat>();

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  formatters.set(timeZone, formatter);
  return formatter;
}

function partsIn(date: Date, timeZone: string): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(date);
  const read = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

function offsetMs(date: Date, timeZone: string): number {
  const parts = partsIn(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const withoutMs = Math.floor(date.getTime() / MS_PER_SECOND) * MS_PER_SECOND;
  return asUtc - withoutMs;
}

/**
 * Instante UTC que corresponde a una fecha-hora de pared en `timeZone`.
 * Se resuelve en dos pasos porque el offset puede cambiar (DST) justo en el
 * instante que estamos calculando.
 */
function fromZonedParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  timeZone: string,
): Date {
  const wallClock = Date.UTC(year, month - 1, day, hour);
  const firstGuess = wallClock - offsetMs(new Date(wallClock), timeZone);
  const corrected = wallClock - offsetMs(new Date(firstGuess), timeZone);
  return new Date(corrected);
}

/** Inicio del bucket de `date` según la granularidad, en el calendario de `timeZone`. */
export function truncateToBucket(
  date: Date,
  granularity: SummaryGranularity,
  timeZone: string,
): Date {
  const { year, month, day, hour } = partsIn(date, timeZone);

  if (granularity === 'hour') {
    return fromZonedParts(year, month, day, hour, timeZone);
  }
  if (granularity === 'day') {
    return fromZonedParts(year, month, day, 0, timeZone);
  }
  return fromZonedParts(year, month, 1, 0, timeZone);
}

/** Inicio del bucket siguiente. `Date.UTC` normaliza los desbordes de hora, día y mes. */
export function addBucket(
  bucketStart: Date,
  granularity: SummaryGranularity,
  timeZone: string,
): Date {
  const { year, month, day, hour } = partsIn(bucketStart, timeZone);

  if (granularity === 'hour') {
    return fromZonedParts(year, month, day, hour + 1, timeZone);
  }
  if (granularity === 'day') {
    return fromZonedParts(year, month, day + 1, 0, timeZone);
  }
  return fromZonedParts(year, month + 1, 1, 0, timeZone);
}

/**
 * Secuencia cronológica y completa de buckets que cubren [from, to].
 *
 * `maxBuckets` es un tope defensivo: un rango enorme con granularidad fina
 * generaría millones de puntos y agotaría la memoria del proceso.
 */
export function buildBucketSequence(
  from: Date,
  to: Date,
  granularity: SummaryGranularity,
  timeZone: string,
  maxBuckets = 1000,
): Date[] {
  const buckets: Date[] = [];
  let cursor = truncateToBucket(from, granularity, timeZone);

  while (cursor.getTime() <= to.getTime()) {
    if (buckets.length >= maxBuckets) {
      throw new RangeError(
        `The requested range produces more than ${maxBuckets} buckets`,
      );
    }
    buckets.push(cursor);
    cursor = addBucket(cursor, granularity, timeZone);
  }

  return buckets;
}

/** Los montos se suman en punto flotante; se cierran a centavos en un solo sitio. */
export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}
