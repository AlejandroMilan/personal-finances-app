/** Violación de una invariante del dominio de presupuestos. */
export class BudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetError';
  }
}
