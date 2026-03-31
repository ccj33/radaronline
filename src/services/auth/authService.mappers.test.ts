import { describe, expect, it, vi } from 'vitest';

import type { ProfileDTO } from '../../types/auth.types';
import { mapProfileToUser, toProfileUpdatePayload } from './authService.mappers';

describe('authService.mappers', () => {
  it('maps nullable database fields to app-safe user fields', () => {
    const profile: ProfileDTO = {
      id: 'user-1',
      nome: 'Maria',
      email: 'maria@example.com',
      role: 'gestor',
      microregiao_id: null,
      ativo: true,
      lgpd_consentimento: false,
      lgpd_consentimento_data: null,
      avatar_id: null,
      created_by: null,
      municipio: null,
      first_access: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    };

    expect(mapProfileToUser(profile)).toEqual({
      id: 'user-1',
      nome: 'Maria',
      email: 'maria@example.com',
      role: 'gestor',
      microregiaoId: 'all',
      microregiaoIds: [],
      ativo: true,
      avatarId: 'zg10',
      lgpdConsentimento: false,
      lgpdConsentimentoData: undefined,
      createdBy: undefined,
      municipio: undefined,
      firstAccess: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    });
  });

  it('converts app updates back to database payload', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00.000Z'));

    expect(
      toProfileUpdatePayload({
        nome: 'Ana',
        microregiaoId: 'all',
        ativo: false,
        lgpdConsentimento: true,
      })
    ).toEqual({
      nome: 'Ana',
      microregiao_id: null,
      ativo: false,
      lgpd_consentimento: true,
      updated_at: '2026-03-01T12:00:00.000Z',
    });

    vi.useRealTimers();
  });
});
