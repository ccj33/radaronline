import { logError } from '../lib/logger';
import { fetchMuralConfigRow, upsertMuralConfigRow } from './automatedEvents/muralConfig.repositories';
import { DEFAULT_MURAL_CONFIG } from './automatedEvents/muralConfig.types';
import type { MuralConfig } from './automatedEvents/muralConfig.types';

export type { MuralConfig };
export { DEFAULT_MURAL_CONFIG };

export async function loadMuralConfig(): Promise<MuralConfig> {
  try {
    const config = await fetchMuralConfigRow();
    return config ?? DEFAULT_MURAL_CONFIG;
  } catch (error) {
    logError('muralConfigService', 'Erro ao carregar config do mural', error);
    return DEFAULT_MURAL_CONFIG;
  }
}

export async function saveMuralConfig(config: MuralConfig): Promise<void> {
  await upsertMuralConfigRow(config);
}
