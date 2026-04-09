import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getBackendApiBaseUrl,
  hasBackendApiConfig,
  isLegacySupabaseAdminFlowDisabled,
  shouldDisableLegacyHubModules,
  shouldUseBackendActionsApi,
  shouldUseBackendAdminUsersApi,
  shouldUseBackendAuthSessionApi,
  shouldUseBackendAuthProfileApi,
  shouldUseBackendRequestsApi,
} from './backendApiConfig';

describe('backendApiConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('normalizes backend base url', () => {
    vi.stubEnv('VITE_BACKEND_API_URL', 'https://api.example.gov.br///');

    expect(getBackendApiBaseUrl()).toBe('https://api.example.gov.br');
    expect(hasBackendApiConfig()).toBe(true);
  });

  it('enables backend admin users api when explicit flag is active', () => {
    vi.stubEnv('VITE_BACKEND_API_URL', 'https://api.example.gov.br');
    vi.stubEnv('VITE_USE_BACKEND_ADMIN_USERS', 'true');

    expect(shouldUseBackendAdminUsersApi()).toBe(true);
  });

  it('prefers backend APIs by default but keeps requests on Supabase unless explicitly enabled', () => {
    vi.stubEnv('VITE_BACKEND_API_URL', 'https://api.example.gov.br');

    expect(shouldUseBackendAdminUsersApi()).toBe(true);
    expect(shouldUseBackendActionsApi()).toBe(true);
    expect(shouldUseBackendRequestsApi()).toBe(false);
    expect(shouldUseBackendAuthProfileApi()).toBe(true);
    expect(shouldUseBackendAuthSessionApi()).toBe(true);
  });

  it('enables backend requests API only when explicit flag is true', () => {
    vi.stubEnv('VITE_BACKEND_API_URL', 'https://api.example.gov.br');
    vi.stubEnv('VITE_USE_BACKEND_REQUESTS', 'true');

    expect(shouldUseBackendRequestsApi()).toBe(true);
  });

  it('forces backend admin flow when legacy cutover is enabled', () => {
    vi.stubEnv('VITE_BACKEND_API_URL', 'https://api.example.gov.br');
    vi.stubEnv('VITE_DISABLE_LEGACY_SUPABASE_ADMIN_FLOW', 'true');

    expect(isLegacySupabaseAdminFlowDisabled()).toBe(true);
    expect(shouldUseBackendAdminUsersApi()).toBe(true);
    expect(shouldUseBackendAuthProfileApi()).toBe(true);
  });

  it('does not enable backend routing without backend api base url', () => {
    vi.stubEnv('VITE_DISABLE_LEGACY_SUPABASE_ADMIN_FLOW', 'true');

    expect(hasBackendApiConfig()).toBe(false);
    expect(shouldUseBackendAdminUsersApi()).toBe(false);
    expect(shouldUseBackendAuthProfileApi()).toBe(false);
  });

  it('allows explicit opt-out back to legacy path for selected domains', () => {
    vi.stubEnv('VITE_BACKEND_API_URL', 'https://api.example.gov.br');
    vi.stubEnv('VITE_USE_BACKEND_ACTIONS', 'false');
    vi.stubEnv('VITE_USE_BACKEND_REQUESTS', 'false');
    vi.stubEnv('VITE_USE_BACKEND_AUTH_SESSION', 'false');

    expect(shouldUseBackendActionsApi()).toBe(false);
    expect(shouldUseBackendRequestsApi()).toBe(false);
    expect(shouldUseBackendAuthSessionApi()).toBe(false);
    expect(shouldUseBackendAdminUsersApi()).toBe(true);
  });

  it('allows explicit shutdown of unsupported legacy hub modules', () => {
    vi.stubEnv('VITE_DISABLE_UNSUPPORTED_HUB_MODULES', 'true');

    expect(shouldDisableLegacyHubModules()).toBe(true);
  });

  it('keeps native hub modules enabled by default even when backend api is configured', () => {
    vi.stubEnv('VITE_BACKEND_API_URL', 'https://api.example.gov.br');

    expect(shouldDisableLegacyHubModules()).toBe(false);
  });
});
