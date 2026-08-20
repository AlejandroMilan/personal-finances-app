import type { ScheduledTransactionView } from '../types/scheduled-transaction';

export interface ScheduleBuckets {
  /** Pendientes cuya fecha prevista ya pasó. */
  overdue: ScheduledTransactionView[];
  /** Pendientes del mes en curso que todavía no vencen. */
  currentMonth: ScheduledTransactionView[];
}

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

/** Último instante del mes al que pertenece `date`, en calendario local. */
export function endOfMonth(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Una agendada está vencida cuando su día previsto es anterior a hoy. El día en
 * curso no cuenta como vencido: todavía da tiempo a ejecutarla.
 */
export function isOverdue(
  scheduled: ScheduledTransactionView,
  now: Date = new Date(),
): boolean {
  return startOfDay(new Date(scheduled.scheduledFor)) < startOfDay(now);
}

export function isInCurrentMonth(
  scheduled: ScheduledTransactionView,
  now: Date = new Date(),
): boolean {
  const date = new Date(scheduled.scheduledFor);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export function sortByScheduledFor(
  items: ScheduledTransactionView[],
): ScheduledTransactionView[] {
  return [...items].sort(
    (a, b) =>
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
  );
}

/**
 * Reparte las pendientes que le interesan al dashboard: las vencidas primero y
 * después las del mes en curso. Lo que queda más allá del mes no se devuelve.
 */
export function splitPendingSchedule(
  items: ScheduledTransactionView[],
  now: Date = new Date(),
): ScheduleBuckets {
  const pending = sortByScheduledFor(
    items.filter((item) => item.status === 'pending'),
  );

  return {
    overdue: pending.filter((item) => isOverdue(item, now)),
    currentMonth: pending.filter(
      (item) => !isOverdue(item, now) && isInCurrentMonth(item, now),
    ),
  };
}

/**
 * Fecha sugerida para la siguiente ocurrencia: un mes después de la prevista.
 * Si el mes destino no tiene ese día (31 de enero) se ajusta a su último día.
 */
export function suggestedNextDate(scheduledFor: string | Date): Date {
  const date =
    scheduledFor instanceof Date ? scheduledFor : new Date(scheduledFor);
  const lastDayOfTargetMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 2,
    0,
  ).getDate();

  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    Math.min(date.getDate(), lastDayOfTargetMonth),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

/** `yyyy-mm-dd` en calendario local, que es lo que espera un `<input type="date">`. */
export function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Convierte el `yyyy-mm-dd` de un input en un instante local al inicio del día. */
export function fromDateInputValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}
