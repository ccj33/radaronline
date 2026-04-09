import type { TeamMember } from '../../types';

export interface TeamDTO {
  id: string;
  microregiao_id: string;
  name: string;
  cargo: string;
  email: string | null;
  municipio: string | null;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamProfileRow {
  id: string;
  nome: string;
  email: string | null;
  municipio: string | null;
  microregiao_id: string | null;
  role: string | null;
}

export interface PendingRegistration {
  id: string;
  name: string;
  email: string | null;
  municipio: string | null;
  microregiaoId: string;
  cargo: string;
  createdAt: string;
}

export interface PendingRegistrationRow {
  id: string;
  name: string;
  email: string | null;
  municipio: string | null;
  microregiao_id: string;
  cargo: string | null;
  created_at: string;
}

export interface TeamInsertInput {
  microregiao_id: string;
  name: string;
  cargo: string;
  email: string | null;
  municipio: string | null;
  profile_id?: string | null;
}

export interface TeamUpdateInput {
  municipio?: string;
  name?: string;
  profile_id?: string | null;
}

export type TeamsByMicro = Record<string, TeamMember[]>;
