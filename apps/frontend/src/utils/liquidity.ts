import type { AccountView } from '../types/account';
import type { DonutData, DonutSlice } from './summary';

export function accountLiquidity(account: AccountView): number {
  if (account.type !== 'credit') {
    return account.balance;
  }

  if (!account.creditCard) {
    return 0;
  }

  return Math.max(
    0,
    account.creditCard.creditLimit - account.creditCard.usedAmount,
  );
}

export function buildLiquidity(accounts: readonly AccountView[]): DonutData {
  const slices: DonutSlice[] = accounts
    .map((account) => ({
      label: account.name,
      value: accountLiquidity(account),
      color: account.color,
    }))
    .filter((slice) => slice.value !== 0);

  const total = roundToCents(
    slices.reduce((sum, slice) => sum + slice.value, 0),
  );

  return {
    slices,
    total,
    isEmpty: slices.length === 0 || total === 0,
  };
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}
