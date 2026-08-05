export interface UserView {
  id: string;
  fullName: string;
  email: string;
  registeredAt: Date;
}

export interface AuthResponse {
  token?: string;
  user: UserView;
}
