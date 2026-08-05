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

  async function fetchAccounts(): Promise<void> {
    loading.value = true;
    try {
      accounts.value = await accountsService.list();
    } finally {
      loading.value = false;
    }
  }

  async function createAccount(payload: CreateAccountPayload): Promise<void> {
    const created = await accountsService.create(payload);
    accounts.value.unshift(created);
  }

  async function updateAccount(id: string, payload: UpdateAccountPayload): Promise<void> {
    const updated = await accountsService.update(id, payload);
    const index = accounts.value.findIndex((account) => account.id === id);
    if (index !== -1) {
      accounts.value[index] = updated;
    }
  }

  async function deleteAccount(id: string): Promise<void> {
    await accountsService.remove(id);
    accounts.value = accounts.value.filter((account) => account.id !== id);
  }

  return { accounts, loading, fetchAccounts, createAccount, updateAccount, deleteAccount };
});
