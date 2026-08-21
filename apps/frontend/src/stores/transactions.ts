import { ref } from 'vue';
import { defineStore } from 'pinia';
import { transactionsService } from '../services/transactions';
import { useAccountsStore } from './accounts';
import type {
  CreateTransactionPayload,
  TransactionFilters,
  TransactionView,
  UpdateTransactionPayload,
} from '../types/transaction';

export const useTransactionsStore = defineStore('transactions', () => {
  const items = ref<TransactionView[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const filters = ref<TransactionFilters>({ page: 1, limit: 20 });
  let sessionGeneration = 0;
  let requestId = 0;

  function isCurrentRequest(generation: number, request: number): boolean {
    return generation === sessionGeneration && request === requestId;
  }

  function isCurrentSession(generation: number): boolean {
    return generation === sessionGeneration;
  }

  function clear(): void {
    sessionGeneration += 1;
    requestId += 1;
    items.value = [];
    total.value = 0;
    loading.value = false;
    filters.value = { page: 1, limit: 20 };
  }

  async function fetchTransactions(): Promise<void> {
    const generation = sessionGeneration;
    const request = ++requestId;
    const requestFilters = filters.value;
    loading.value = true;
    try {
      const result = await transactionsService.list(requestFilters);
      if (isCurrentRequest(generation, request)) {
        items.value = result.items;
        total.value = result.total;
      }
    } finally {
      if (isCurrentRequest(generation, request)) {
        loading.value = false;
      }
    }
  }

  function setPage(page: number): Promise<void> {
    filters.value = { ...filters.value, page };
    return fetchTransactions();
  }

  function applyFilters(partial: Partial<TransactionFilters>): Promise<void> {
    filters.value = { ...filters.value, ...partial, page: 1 };
    return fetchTransactions();
  }

  async function createTransaction(payload: CreateTransactionPayload): Promise<void> {
    const generation = sessionGeneration;
    requestId += 1;
    loading.value = false;
    await transactionsService.create(payload);
    if (!isCurrentSession(generation)) return;
    await refreshAffected(generation);
  }

  async function updateTransaction(
    id: string,
    payload: UpdateTransactionPayload,
  ): Promise<void> {
    const generation = sessionGeneration;
    requestId += 1;
    loading.value = false;
    await transactionsService.update(id, payload);
    if (!isCurrentSession(generation)) return;
    await refreshAffected(generation);
  }

  async function deleteTransaction(id: string): Promise<void> {
    const generation = sessionGeneration;
    requestId += 1;
    loading.value = false;
    await transactionsService.remove(id);
    if (!isCurrentSession(generation)) return;
    await refreshAffected(generation);
  }

  async function refreshAffected(generation: number): Promise<void> {
    await fetchTransactions();
    if (!isCurrentSession(generation)) return;
    const accountsStore = useAccountsStore();
    await accountsStore.fetchAccounts();
  }

  return {
    items,
    total,
    loading,
    filters,
    clear,
    fetchTransactions,
    setPage,
    applyFilters,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
});
