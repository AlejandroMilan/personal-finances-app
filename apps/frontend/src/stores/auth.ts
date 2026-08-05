import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { authService } from '../services/auth';
import type { User } from '../types/auth';

const TOKEN_KEY = 'auth-token';
const USER_KEY = 'auth-user';

function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<User | null>(readStoredUser());
  const isAuthenticated = computed(() => token.value !== null);

  function persist(): void {
    if (token.value) localStorage.setItem(TOKEN_KEY, token.value);
    if (user.value) localStorage.setItem(USER_KEY, JSON.stringify(user.value));
  }

  async function login(email: string, password: string): Promise<void> {
    const response = await authService.login({ email, password });
    if (!response.token) throw new Error('No token returned');
    token.value = response.token;
    user.value = response.user;
    persist();
  }

  async function register(fullName: string, email: string, password: string): Promise<void> {
    await authService.register({ fullName, email, password });
  }

  function logout(): void {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  return { token, user, isAuthenticated, login, register, logout };
});
