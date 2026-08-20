/** Violación de una invariante del dominio de la agenda. */
export class ScheduledTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScheduledTransactionError';
  }
}
