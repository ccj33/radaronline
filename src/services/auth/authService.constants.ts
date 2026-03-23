const AUTH_PROFILE_FIELDS = [
  'id',
  'nome',
  'email',
  'role',
  'microregiao_id',
  'ativo',
  'lgpd_consentimento',
  'lgpd_consentimento_data',
  'avatar_id',
  'created_by',
  'municipio',
  'first_access',
  'created_at',
  'updated_at',
];

export const AUTH_PROFILE_SELECT = AUTH_PROFILE_FIELDS.join(', ');

export const AUTH_EDGE_FUNCTION_TIMEOUT_MS = (() => {
  try {
    const envValue = (import.meta as any).env?.VITE_API_TIMEOUT;
    return envValue ? Number(envValue) : 30000;
  } catch {
    return 30000;
  }
})();

export const AUTH_PROFILE_RETRY_COUNT = 2;
export const AUTH_PROFILE_RETRY_DELAY_MS = 500;
