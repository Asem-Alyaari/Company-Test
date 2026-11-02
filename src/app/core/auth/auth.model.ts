export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER' | string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  token: string;
}
