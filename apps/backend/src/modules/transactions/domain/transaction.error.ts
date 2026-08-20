/** Violación de una invariante del dominio de las transacciones. */
export class TransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionError';
  }
}
