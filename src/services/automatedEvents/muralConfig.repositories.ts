import { getPlatformClient } from '../platformClient';
import type { MuralConfig, MuralConfigRow } from './muralConfig.types';

const CONFIG_ID = 'default';

export async function fetchMuralConfigRow(): Promise<MuralConfig | null> {
  try {
    const { data, error } = await getPlatformClient()
      .from('mural_config')
      .select('*')
      .eq('id', CONFIG_ID)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as MuralConfigRow;
    return {
      enabledTypes: (row.enabled_types as MuralConfig['enabledTypes']) ?? null,
      microScope: (row.micro_scope as MuralConfig['microScope']) ?? 'all',
      microNames: row.micro_names ?? [],
    };
  } catch {
    // Tabela ainda não foi criada no Supabase — retorna null (usa defaults)
    return null;
  }
}

export async function upsertMuralConfigRow(config: MuralConfig): Promise<void> {
  const { error } = await getPlatformClient()
    .from('mural_config')
    .upsert(
      {
        id: CONFIG_ID,
        enabled_types: config.enabledTypes,
        micro_scope: config.microScope,
        micro_names: config.microScope === 'specific' ? config.microNames : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (error) {
    // Log so devs can see the actual Supabase error in browser console
    console.error('[mural_config] upsert error:', error.message, error.code, error.details);
    throw error;
  }
}
