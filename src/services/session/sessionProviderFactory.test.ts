import { afterEach, describe, expect, it, vi } from 'vitest';

import { backendFirstSessionProvider } from './backendFirstSessionProvider';
import { getSessionProvider } from './sessionProviderFactory';
import { supabaseSessionProvider } from './supabaseSessionProvider';

describe('sessionProviderFactory', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns backend-first provider when backend api is configured and no opt-out exists', () => {
    vi.stubEnv('VITE_BACKEND_API_URL', 'https://api.example.gov.br');

    expect(getSessionProvider()).toBe(backendFirstSessionProvider);
  });

  it('returns supabase provider when backend auth session flag is disabled', () => {
    vi.stubEnv('VITE_BACKEND_API_URL', 'https://api.example.gov.br');
    vi.stubEnv('VITE_USE_BACKEND_AUTH_SESSION', 'false');

    expect(getSessionProvider()).toBe(supabaseSessionProvider);
  });
});
