import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { watch } from 'vue';

vi.mock('../services/auth', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

vi.mock('../services/accounts', () => ({
  accountsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../services/categories', () => ({
  categoriesService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../services/scheduled-transactions', () => ({
  scheduledTransactionsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    execute: vi.fn(),
    cancel: vi.fn(),
  },
}));

vi.mock('../services/transactions', () => ({
  transactionsService: {
    list: vi.fn(),
    summary: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { authService } from '../services/auth';
import { accountsService } from '../services/accounts';
import { categoriesService } from '../services/categories';
import { scheduledTransactionsService } from '../services/scheduled-transactions';
import { transactionsService } from '../services/transactions';
import type { AccountView } from '../types/account';
import type { AuthResponse } from '../types/auth';
import type { CategoryView } from '../types/category';
import type { ScheduledTransactionView } from '../types/scheduled-transaction';
import type { PaginatedTransactions, TransactionView } from '../types/transaction';
import type { TransactionsSummaryView } from '../types/summary';
import { useAccountsStore } from './accounts';
import { useCategoriesStore } from './categories';
import { useAuthStore } from './auth';
import { useDashboardStore } from './dashboard';
import { useScheduledTransactionsStore } from './scheduled-transactions';
import { useTransactionsStore } from './transactions';

const response: AuthResponse = {
  token: 'jwt-token',
  user: {
    id: 'u1',
    fullName: 'Ana García',
    email: 'ana@mail.com',
    registeredAt: '2026-01-01T00:00:00.000Z',
  },
};

const otherUserResponse: AuthResponse = {
  token: 'other-jwt-token',
  user: {
    id: 'u2',
    fullName: 'Bruno López',
    email: 'bruno@mail.com',
    registeredAt: '2026-01-02T00:00:00.000Z',
  },
};

const account: AccountView = {
  id: 'a1',
  name: 'Savings',
  balance: 100,
  color: '#2E6B4F',
  type: 'cash',
  creditCard: null,
};

const category: CategoryView = {
  id: 'c1',
  name: 'Food',
  color: '#2E6B4F',
};

const scheduled: ScheduledTransactionView = {
  id: 's1',
  accountId: 'a1',
  destinationAccountId: null,
  categoryId: 'c1',
  type: 'expense',
  title: 'Rent',
  amount: 12000,
  tags: [],
  scheduledFor: '2026-09-01T00:00:00.000Z',
  recurring: true,
  status: 'pending',
  transactionId: null,
};

const transaction: TransactionView = {
  id: 't1',
  accountId: 'a1',
  destinationAccountId: null,
  categoryId: 'c1',
  type: 'expense',
  title: 'Lunch',
  amount: 50,
  timestamp: '2026-08-01T12:00:00.000Z',
  tags: ['food'],
};

const summary: TransactionsSummaryView = {
  from: '2026-08-01T06:00:00.000Z',
  to: '2026-09-01T05:59:59.999Z',
  granularity: 'day',
  timeZone: 'America/Mexico_City',
  totals: { income: 900, expense: 250.5 },
  byCategory: {
    income: [{ categoryId: 'c3', total: 900 }],
    expense: [{ categoryId: 'c1', total: 250.5 }],
  },
  series: [
    { bucket: '2026-08-01T06:00:00.000Z', income: 900, expense: 250.5 },
  ],
};

function seedUserData(): void {
  useAccountsStore().accounts = [account];
  useCategoriesStore().categories = [category];
  useScheduledTransactionsStore().items = [scheduled];
  useTransactionsStore().items = [transaction];
  useTransactionsStore().total = 1;
  useDashboardStore().summary = summary;
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('logs in and persists token and user', async () => {
    vi.mocked(authService.login).mockResolvedValue(response);
    const store = useAuthStore();

    await store.login('ana@mail.com', 'secret123');

    expect(store.isAuthenticated).toBe(true);
    expect(store.token).toBe('jwt-token');
    expect(store.user?.fullName).toBe('Ana García');
    expect(localStorage.getItem('auth-token')).toBe('jwt-token');
    expect(localStorage.getItem('auth-user')).toContain('Ana García');
  });

  it('throws when no token is returned', async () => {
    vi.mocked(authService.login).mockResolvedValue({ user: response.user });
    const store = useAuthStore();

    await expect(store.login('ana@mail.com', 'secret123')).rejects.toThrow('No token returned');
    expect(store.isAuthenticated).toBe(false);
  });

  it('registers a user', async () => {
    vi.mocked(authService.register).mockResolvedValue({ user: response.user });
    const store = useAuthStore();

    await store.register('Ana García', 'ana@mail.com', 'secret123');

    expect(authService.register).toHaveBeenCalledWith({
      fullName: 'Ana García',
      email: 'ana@mail.com',
      password: 'secret123',
    });
    expect(store.isAuthenticated).toBe(false);
  });

  it('logs out clearing state and storage', async () => {
    vi.mocked(authService.login).mockResolvedValue(response);
    const store = useAuthStore();
    await store.login('ana@mail.com', 'secret123');
    seedUserData();

    store.logout();

    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
    expect(localStorage.getItem('auth-token')).toBeNull();
    expect(localStorage.getItem('auth-user')).toBeNull();
    expect(useAccountsStore().accounts).toEqual([]);
    expect(useCategoriesStore().categories).toEqual([]);
    expect(useScheduledTransactionsStore().items).toEqual([]);
    expect(useTransactionsStore().items).toEqual([]);
    expect(useTransactionsStore().total).toBe(0);
    expect(useDashboardStore().summary).toBeNull();
  });

  it('clears previous data before exposing a different authenticated user', async () => {
    vi.mocked(authService.login)
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce(otherUserResponse);
    const store = useAuthStore();

    await store.login('ana@mail.com', 'secret123');
    seedUserData();

    let dataWasClearedWhenUserChanged = false;
    const stopWatching = watch(
      () => store.user?.id,
      (userId) => {
        if (userId === otherUserResponse.user.id) {
          dataWasClearedWhenUserChanged =
            useAccountsStore().accounts.length === 0 &&
            useCategoriesStore().categories.length === 0 &&
            useScheduledTransactionsStore().items.length === 0 &&
            useTransactionsStore().items.length === 0 &&
            useTransactionsStore().total === 0 &&
            useDashboardStore().summary === null;
        }
      },
      { flush: 'sync' },
    );

    try {
      await store.login('bruno@mail.com', 'secret123');

      expect(store.user?.id).toBe('u2');
      expect(dataWasClearedWhenUserChanged).toBe(true);
    } finally {
      stopWatching();
    }
  });

  it('ignores an older login response when a newer login finishes first', async () => {
    const olderResponse = deferred<AuthResponse>();
    const newerResponse = deferred<AuthResponse>();
    vi.mocked(authService.login)
      .mockReturnValueOnce(olderResponse.promise)
      .mockReturnValueOnce(newerResponse.promise);
    const store = useAuthStore();

    const olderLogin = store.login('ana@mail.com', 'secret123');
    const newerLogin = store.login('bruno@mail.com', 'secret123');

    newerResponse.resolve(otherUserResponse);
    await newerLogin;
    olderResponse.resolve(response);
    await olderLogin;

    expect(store.user?.id).toBe('u2');
    expect(store.token).toBe('other-jwt-token');
    expect(localStorage.getItem('auth-token')).toBe('other-jwt-token');
    expect(localStorage.getItem('auth-user')).toContain('Bruno López');
  });

  it('ignores a login response that arrives after logout', async () => {
    const pendingResponse = deferred<AuthResponse>();
    vi.mocked(authService.login).mockReturnValueOnce(pendingResponse.promise);
    const store = useAuthStore();

    const pendingLogin = store.login('ana@mail.com', 'secret123');
    store.logout();
    pendingResponse.resolve(response);
    await pendingLogin;

    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
    expect(localStorage.getItem('auth-token')).toBeNull();
    expect(localStorage.getItem('auth-user')).toBeNull();
  });

  it('does not let delayed requests from user A overwrite stores after user B logs in', async () => {
    const previousAccounts = deferred<AccountView[]>();
    const previousCategories = deferred<CategoryView[]>();
    const previousSchedule = deferred<ScheduledTransactionView[]>();
    const previousTransactions = deferred<PaginatedTransactions>();
    const previousSummary = deferred<TransactionsSummaryView>();
    const currentAccount = { ...account, id: 'a2', name: 'Checking' };
    const currentCategory = { ...category, id: 'c2', name: 'Transport' };
    const currentScheduled = { ...scheduled, id: 's2', title: 'Salary' };
    const currentTransaction = { ...transaction, id: 't2', title: 'Current' };
    const currentPage: PaginatedTransactions = {
      items: [currentTransaction],
      total: 1,
      page: 1,
      limit: 20,
    };
    const currentSummary: TransactionsSummaryView = {
      ...summary,
      totals: { income: 0, expense: 800 },
    };

    vi.mocked(authService.login)
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce(otherUserResponse);
    vi.mocked(accountsService.list)
      .mockReturnValueOnce(previousAccounts.promise)
      .mockResolvedValueOnce([currentAccount]);
    vi.mocked(categoriesService.list)
      .mockReturnValueOnce(previousCategories.promise)
      .mockResolvedValueOnce([currentCategory]);
    vi.mocked(scheduledTransactionsService.list)
      .mockReturnValueOnce(previousSchedule.promise)
      .mockResolvedValueOnce([currentScheduled]);
    vi.mocked(transactionsService.list)
      .mockReturnValueOnce(previousTransactions.promise)
      .mockResolvedValueOnce(currentPage);
    vi.mocked(transactionsService.summary)
      .mockReturnValueOnce(previousSummary.promise)
      .mockResolvedValueOnce(currentSummary);

    const auth = useAuthStore();
    await auth.login('ana@mail.com', 'secret123');

    const accounts = useAccountsStore();
    const categories = useCategoriesStore();
    const schedule = useScheduledTransactionsStore();
    const transactions = useTransactionsStore();
    const dashboard = useDashboardStore();
    seedUserData();

    const previousFetches = Promise.all([
      accounts.fetchAccounts(),
      categories.fetchCategories(),
      schedule.fetchScheduled(),
      transactions.fetchTransactions(),
      dashboard.fetchSummary(),
    ]);

    await auth.login('bruno@mail.com', 'secret123');

    expect(accounts.accounts).toEqual([]);
    expect(categories.categories).toEqual([]);
    expect(schedule.items).toEqual([]);
    expect(transactions.items).toEqual([]);
    expect(transactions.total).toBe(0);
    expect(dashboard.summary).toBeNull();

    const currentFetches = Promise.all([
      accounts.fetchAccounts(),
      categories.fetchCategories(),
      schedule.fetchScheduled(),
      transactions.fetchTransactions(),
      dashboard.fetchSummary(),
    ]);
    await currentFetches;

    previousAccounts.resolve([account]);
    previousCategories.resolve([category]);
    previousSchedule.resolve([scheduled]);
    previousTransactions.resolve({
      items: [transaction],
      total: 1,
      page: 1,
      limit: 20,
    });
    previousSummary.resolve(summary);
    await previousFetches;

    expect(accounts.accounts).toEqual([currentAccount]);
    expect(categories.categories).toEqual([currentCategory]);
    expect(schedule.items).toEqual([currentScheduled]);
    expect(transactions.items).toEqual([currentTransaction]);
    expect(transactions.total).toBe(1);
    expect(dashboard.summary).toEqual(currentSummary);
  });

  it('restores the session from localStorage', () => {
    localStorage.setItem('auth-token', 'jwt-token');
    localStorage.setItem('auth-user', JSON.stringify(response.user));

    const store = useAuthStore();

    expect(store.isAuthenticated).toBe(true);
    expect(store.user?.email).toBe('ana@mail.com');
  });

  it('ignores a corrupted stored user', () => {
    localStorage.setItem('auth-token', 'jwt-token');
    localStorage.setItem('auth-user', '{not-json');

    const store = useAuthStore();

    expect(store.isAuthenticated).toBe(true);
    expect(store.user).toBeNull();
  });
});

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
