import type { AutomatedEventType } from './automatedEventsService.types';

export interface MuralConfig {
  enabledTypes: AutomatedEventType[] | null; // null = todos os tipos habilitados
  microScope: 'all' | 'specific';
  microNames: string[]; // valores do campo municipality na tabela (só usado quando microScope = 'specific')
}

export interface MuralConfigRow {
  id: string;
  enabled_types: string[] | null;
  micro_scope: string;
  micro_names: string[] | null;
  updated_at: string;
}

export const DEFAULT_MURAL_CONFIG: MuralConfig = {
  enabledTypes: null,
  microScope: 'all',
  microNames: [],
};

/*
  SQL para criar a tabela no Supabase (rodar uma vez no SQL Editor):

  create table if not exists mural_config (
    id text primary key default 'default',
    enabled_types text[] default null,
    micro_scope text not null default 'all',
    micro_names text[] default null,
    updated_at timestamptz not null default now()
  );

  Sem essa tabela as queries falham silenciosamente e o Mural exibe tudo (comportamento padrão).
*/
