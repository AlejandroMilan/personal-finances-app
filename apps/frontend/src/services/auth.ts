import type { AuthResponse, LoginPayload, RegisterPayload } from '../types/auth';

const API_BASE = '/api';

interface ApiErrorBody {
  message?: string | string[];
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    const message = Array.isArray(body?.message)
      ? body!.message![0]
      : (body?.message ?? 'Request failed');
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const authService = {
  register(payload: RegisterPayload): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  login(payload: LoginPayload): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
