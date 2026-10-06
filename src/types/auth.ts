export type UserRole = 'ADMIN' | 'CHEF';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  shift?: string;
  assignedStation?: string;
  assigned_station?: string;
  is_active?: boolean;
  isActive?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}
