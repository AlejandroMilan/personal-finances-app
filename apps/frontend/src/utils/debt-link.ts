import type { DebtLink, DebtLinkKind, DebtLinkPayload } from '../types/debt';
import { paymentCapitalError } from './debt';

/** Estado del bloque "deuda" de un formulario de transacción o de agenda. */
export interface DebtLinkForm {
  enabled: boolean;
  kind: DebtLinkKind;
  debtId: string | null;
  /** Pago: parte del monto que abona al capital. */
  capital: number;
  /** Aumento: interés adicional sobre lo recibido. */
  extraInterest: number;
}

export function emptyDebtLinkForm(): DebtLinkForm {
  return {
    enabled: false,
    kind: 'payment',
    debtId: null,
    capital: 0,
    extraInterest: 0,
  };
}

/** Pagos sólo en gastos, aumentos sólo en ingresos; transferencias no admiten deuda. */
export function debtLinkKindFor(type: string): DebtLinkKind | null {
  if (type === 'expense') return 'payment';
  if (type === 'income') return 'increase';
  return null;
}

/**
 * El vínculo sólo está activo si se activó y su tipo coincide con el tipo
 * actual del movimiento; así cambiar de gasto a ingreso no deja un pago oculto.
 */
export function isDebtLinkActive(form: DebtLinkForm, type: string): boolean {
  return form.enabled && debtLinkKindFor(type) === form.kind;
}

export function debtLinkFormFrom(link: DebtLink | null | undefined): DebtLinkForm {
  if (!link) return emptyDebtLinkForm();
  return {
    enabled: true,
    kind: link.kind,
    debtId: link.debtId,
    capital: link.capitalAmount,
    extraInterest: link.interestAmount,
  };
}

/** Mensaje de validación del vínculo activo, o `null` si es válido o no aplica. */
export function debtLinkError(form: DebtLinkForm, type: string, amount: number): string | null {
  if (!isDebtLinkActive(form, type)) return null;
  if (!form.debtId) return 'Elige la deuda a vincular';
  if (form.kind === 'payment') return paymentCapitalError(amount, form.capital);
  if (!Number.isFinite(form.extraInterest) || form.extraInterest < 0) {
    return 'El interés adicional no es válido';
  }
  return null;
}

/**
 * Payload del vínculo para crear o editar. Sin vínculo activo devuelve `null`
 * si había uno que quitar (edición), o `undefined` para no enviar el campo.
 */
export function buildDebtLinkPayload(
  form: DebtLinkForm,
  type: string,
  hadLink: boolean,
): DebtLinkPayload | null | undefined {
  if (!isDebtLinkActive(form, type) || !form.debtId) {
    return hadLink ? null : undefined;
  }
  if (form.kind === 'payment') {
    return { kind: 'payment', debtId: form.debtId, capitalAmount: form.capital };
  }
  return { kind: 'increase', debtId: form.debtId, interestAmount: form.extraInterest };
}
