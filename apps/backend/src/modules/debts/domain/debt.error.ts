/** Violación de una invariante del dominio de deudas. */
export class DebtError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DebtError';
  }
}
