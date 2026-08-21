import { ref } from 'vue';
import { defineStore } from 'pinia';
import { accountsService } from '../services/accounts';
import type {
  AccountView,
  CreateAccountPayload,
  UpdateAccountPayload,
} from '../types/account';

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<AccountView[]>([]);
  const loading = ref(false);
  let sessionGeneration = 0;
  let requestId = 0;

  function isCurrentRequest(generation: number, request: number): boolean {
    return generation === sessionGeneration && request === requestId;
  }

  function clear(): void {
    sessionGeneration += 1;
    requestId += 1;
    accounts.value = [];
    loading.value = false;
  }

  async function fetchAccounts(): Promise<void> {
    const generation = sessionGeneration;
    const request = ++requestId;
    loading.value = true;
    try {
      const loadedAccounts = await accountsService.list();
      if (isCurrentRequest(generation, request)) {
        accounts.value = loadedAccounts;
      }
    } finally {
      if (isCurrentRequest(generation, request)) {
        loading.value = false;
      }
    }
  }

  async function createAccount(payload: CreateAccountPayload): Promise<void> {
    const generation = sessionGeneration;
    const request = ++requestId;
    loading.value = false;
    const created = await accountsService.create(payload);
    if (!isCurrentRequest(generation, request)) return;
    accounts.value.unshift(created);
  }

  async function updateAccount(id: string, payload: UpdateAccountPayload): Promise<void> {
    const generation = sessionGeneration;
    const request = ++requestId;
    loading.value = false;
    const updated = await accountsService.update(id, payload);
    if (!isCurrentRequest(generation, request)) return;
    const index = accounts.value.findIndex((account) => account.id === id);
    if (index !== -1) {
      accounts.value[index] = updated;
    }
  }

  async function deleteAccount(id: string): Promise<void> {
    const generation = sessionGeneration;
    const request = ++requestId;
    loading.value = false;
    await accountsService.remove(id);
    if (!isCurrentRequest(generation, request)) return;
    accounts.value = accounts.value.filter((account) => account.id !== id);
  }

  return {
    accounts,
    loading,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    clear,
  };
});
