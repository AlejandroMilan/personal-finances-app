import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../services/auth', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

import { authService } from '../services/auth';
import type { AuthResponse } from '../types/auth';
import { useAuthStore } from './auth';

const response: AuthResponse = {
  token: 'jwt-token',
  user: {
    id: 'u1',
    fullName: 'Ana García',
    email: 'ana@mail.com',
    registeredAt: '2026-01-01T00:00:00.000Z',
  },
};

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

    store.logout();

    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
    expect(localStorage.getItem('auth-token')).toBeNull();
    expect(localStorage.getItem('auth-user')).toBeNull();
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
