import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../services/accounts', () => ({
  accountsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { accountsService } from '../services/accounts';
import type { AccountView } from '../types/account';
import { useAccountsStore } from './accounts';

const account: AccountView = {
  id: 'a1',
  name: 'Savings',
  balance: 100,
  color: '#2E6B4F',
  type: 'cash',
  creditCard: null,
};

describe('accounts store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetches the accounts of the user', async () => {
    vi.mocked(accountsService.list).mockResolvedValue([account]);
    const store = useAccountsStore();

    await store.fetchAccounts();

    expect(store.accounts).toHaveLength(1);
    expect(store.accounts[0].name).toBe('Savings');
    expect(store.loading).toBe(false);
  });

  it('ignores a delayed response from an invalidated session', async () => {
    let resolvePrevious: (value: AccountView[]) => void = () => undefined;
    const previousResponse = new Promise<AccountView[]>((resolve) => {
      resolvePrevious = resolve;
    });
    vi.mocked(accountsService.list)
      .mockReturnValueOnce(previousResponse)
      .mockResolvedValueOnce([{ ...account, id: 'a2', name: 'Current' }]);
    const store = useAccountsStore();

    const previousFetch = store.fetchAccounts();
    store.clear();
    const currentFetch = store.fetchAccounts();
    resolvePrevious([account]);

    await Promise.all([previousFetch, currentFetch]);

    expect(store.accounts.map((entry) => entry.name)).toEqual(['Current']);
  });

  it('keeps the newest response when same-session requests finish out of order', async () => {
    let resolvePrevious: (value: AccountView[]) => void = () => undefined;
    const previousResponse = new Promise<AccountView[]>((resolve) => {
      resolvePrevious = resolve;
    });
    vi.mocked(accountsService.list)
      .mockReturnValueOnce(previousResponse)
      .mockResolvedValueOnce([{ ...account, id: 'a2', name: 'Current' }]);
    const store = useAccountsStore();

    const previousFetch = store.fetchAccounts();
    const currentFetch = store.fetchAccounts();
    await currentFetch;
    resolvePrevious([account]);
    await previousFetch;

    expect(store.accounts.map((entry) => entry.name)).toEqual(['Current']);
  });

  it('creates an account prepending it to the list', async () => {
    vi.mocked(accountsService.create).mockResolvedValue(account);
    const store = useAccountsStore();

    await store.createAccount({
      name: 'Savings',
      balance: 100,
      color: '#2E6B4F',
      type: 'cash',
    });

    expect(store.accounts).toHaveLength(1);
  });

  it('updates an account in place', async () => {
    vi.mocked(accountsService.update).mockResolvedValue({ ...account, name: 'Renamed' });
    const store = useAccountsStore();
    store.accounts = [account];

    await store.updateAccount('a1', { name: 'Renamed' });

    expect(store.accounts[0].name).toBe('Renamed');
  });

  it('removes an account from the list', async () => {
    vi.mocked(accountsService.remove).mockResolvedValue(undefined);
    const store = useAccountsStore();
    store.accounts = [account];

    await store.deleteAccount('a1');

    expect(accountsService.remove).toHaveBeenCalledWith('a1');
    expect(store.accounts).toHaveLength(0);
  });
});
