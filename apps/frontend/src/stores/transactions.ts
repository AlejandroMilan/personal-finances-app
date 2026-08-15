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

  async function fetchTransactions(): Promise<void> {
    loading.value = true;
    try {
      const result = await transactionsService.list(filters.value);
      items.value = result.items;
      total.value = result.total;
    } finally {
      loading.value = false;
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
    await transactionsService.create(payload);
    await refreshAffected();
  }

  async function updateTransaction(
    id: string,
    payload: UpdateTransactionPayload,
  ): Promise<void> {
    await transactionsService.update(id, payload);
    await refreshAffected();
  }

  async function deleteTransaction(id: string): Promise<void> {
    await transactionsService.remove(id);
    await refreshAffected();
  }

  async function refreshAffected(): Promise<void> {
    await fetchTransactions();
    const accountsStore = useAccountsStore();
    await accountsStore.fetchAccounts();
  }

  return {
    items,
    total,
    loading,
    filters,
    fetchTransactions,
    setPage,
    applyFilters,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
});
