import { User } from '../../types/auth.types';
import { PendingRegistration } from '../../services/teamsService';

export type AdminPanelTab =
  | 'dashboard'
  | 'atividades'
  | 'usuarios'
  | 'microregioes'
  | 'ranking'
  | 'requests'
  | 'communication'
  | 'mural-eventos';

export interface AdminDropdownPosition {
  top: number;
  left: number;
  openUp: boolean;
}

export interface PendingUserData {
  nome?: string;
  email?: string;
  microregiaoId?: string;
  municipio?: string;
}

export interface AdminToggleState {
  open: boolean;
  user?: User | null;
  nextStatus?: boolean;
}

export interface AdminDeleteState {
  open: boolean;
  user?: User | null;
}

export type AdminUserPayload = Partial<User> & {
  senha?: string;
  municipality?: string;
  municipio?: string;
};

export type { PendingRegistration };
