export type PeriodPreset = 'day' | 'week' | 'month' | 'year';
export type PeriodKind = PeriodPreset | 'custom';
export type Granularity = 'hour' | 'day' | 'month';

export interface PeriodRange {
  kind: PeriodKind;
  from: Date;
  to: Date;
  granularity: Granularity;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Por encima de estas duraciones un rango personalizado sube de granularidad. */
const HOURLY_MAX_DAYS = 2;
const DAILY_MAX_DAYS = 92;

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

/** Días transcurridos desde el lunes: getDay() devuelve 0 para domingo. */
const daysSinceMonday = (date: Date): number => (date.getDay() + 6) % 7;

function presetBounds(
  preset: PeriodPreset,
  now: Date,
): { from: Date; to: Date } {
  if (preset === 'day') {
    return { from: startOfDay(now), to: endOfDay(now) };
  }

  if (preset === 'week') {
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysSinceMonday(now));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: startOfDay(monday), to: endOfDay(sunday) };
  }

  if (preset === 'month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }

  return {
    from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
    to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
  };
}

/**
 * Granularidad con la que se agrupa la serie temporal. Los presets tienen una
 * fija; un rango personalizado la deriva de su duración para no devolver ni
 * cuatro puntos ni varios miles.
 */
export function resolveGranularity(
  kind: PeriodKind,
  from?: Date,
  to?: Date,
): Granularity {
  if (kind === 'day') {
    return 'hour';
  }
  if (kind === 'week' || kind === 'month') {
    return 'day';
  }
  if (kind === 'year') {
    return 'month';
  }

  if (!from || !to) {
    throw new RangeError('A custom period needs both a start and an end date');
  }

  const spanInDays = (to.getTime() - from.getTime()) / MS_PER_DAY;
  if (spanInDays <= HOURLY_MAX_DAYS) {
    return 'hour';
  }
  if (spanInDays <= DAILY_MAX_DAYS) {
    return 'day';
  }
  return 'month';
}

/** Periodo en curso relativo a `now`, en la hora local del navegador. */
export function buildPeriodRange(
  preset: PeriodPreset,
  now: Date = new Date(),
): PeriodRange {
  const { from, to } = presetBounds(preset, now);
  return { kind: preset, from, to, granularity: resolveGranularity(preset) };
}

/**
 * Rango elegido a mano. Se expande a días completos: quien elige "del 1 al 5"
 * espera que el día 5 entre entero.
 */
export function buildCustomPeriodRange(from: Date, to: Date): PeriodRange {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new RangeError('A custom period needs two valid dates');
  }

  const start = startOfDay(from);
  const end = endOfDay(to);

  if (start.getTime() > end.getTime()) {
    throw new RangeError('The start date must not be after the end date');
  }

  return {
    kind: 'custom',
    from: start,
    to: end,
    granularity: resolveGranularity('custom', start, end),
  };
}

/**
 * Convierte el valor de un `<input type="date">` (`YYYY-MM-DD`) en una fecha
 * local. `new Date('2026-08-01')` la interpretaría como UTC y desplazaría el día
 * para quien no esté en el meridiano de Greenwich.
 */
export function parseDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(Number.NaN);
  }
  return new Date(year, month - 1, day);
}

/** Formato `YYYY-MM-DD` que espera un `<input type="date">`. */
export function toDateInput(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Zona IANA del navegador; el backend la usa para alinear los buckets. */
export function currentTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
