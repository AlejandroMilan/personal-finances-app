import type {
  AccountView,
  CreateAccountPayload,
  UpdateAccountPayload,
} from '../types/account';
import { apiFetch } from './api';

export const accountsService = {
  list(): Promise<AccountView[]> {
    return apiFetch<AccountView[]>('/accounts');
  },

  create(payload: CreateAccountPayload): Promise<AccountView> {
    return apiFetch<AccountView>('/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateAccountPayload): Promise<AccountView> {
    return apiFetch<AccountView>(`/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`/accounts/${id}`, { method: 'DELETE' });
  },
};
