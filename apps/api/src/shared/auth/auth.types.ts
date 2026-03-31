export type UserRole = 'superadmin' | 'admin' | 'gestor' | 'usuario';

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  microregionId: string | null;   // primária (primeiro ID da lista)
  microregionIds: string[];        // todas as micros acessíveis
}

export interface AuthenticatedSession {
  authenticated: true;
  user: SessionUser;
}

export interface AnonymousSession {
  authenticated: false;
  user?: undefined;
}

export type CurrentSession = AuthenticatedSession | AnonymousSession;
