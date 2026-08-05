export interface User {
  id: string;
  fullName: string;
  email: string;
  registeredAt: string;
}

export interface AuthResponse {
  token?: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}
