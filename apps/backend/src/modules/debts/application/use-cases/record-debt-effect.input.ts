export interface RecordDebtEffectInput {
  userId: string;
  debtId: string;
  transactionId: string;
  /** Pago: capital abonado. Aumento: monto recibido. */
  capitalAmount: number;
  /** Pago: interés (monto − capital). Aumento: interés adicional. */
  interestAmount: number;
  occurredAt: Date;
}
