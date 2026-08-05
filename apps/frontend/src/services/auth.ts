import type { AuthResponse, LoginPayload, RegisterPayload } from '../types/auth';
import { apiFetch } from './api';

export const authService = {
  register(payload: RegisterPayload): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  login(payload: LoginPayload): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
