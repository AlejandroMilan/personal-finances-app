/**
 * Fecha sugerida para la siguiente ocurrencia de una agendada recurrente: la misma
 * fecha un mes después. Cuando el mes destino no tiene ese día (31 de enero → febrero)
 * se ajusta a su último día. La aritmética es en UTC para que no dependa de la zona
 * horaria del proceso.
 */
export function nextScheduledDate(date: Date): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();

  return new Date(
    Date.UTC(
      year,
      month + 1,
      Math.min(date.getUTCDate(), lastDayOfTargetMonth),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}
