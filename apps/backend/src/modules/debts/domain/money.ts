/** Único punto de redondeo de montos del módulo de deudas (centavos). */
export const roundMoney = (value: number): number =>
  Math.round(value * 100) / 100;
