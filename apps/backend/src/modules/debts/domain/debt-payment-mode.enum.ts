/**
 * Qué se descuenta del saldo de la deuda al registrar un pago:
 * sólo la parte de capital, o el monto completo pagado (capital + interés).
 */
export enum DebtPaymentMode {
  CAPITAL = 'capital',
  TOTAL = 'total',
}
