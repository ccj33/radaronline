import { describe, expect, it } from 'vitest';

import { getCurrentMicrorregiao, extractProfileFromMetadata } from './authContext.utils';

describe('authContext.utils', () => {
  it('extracts a user profile from auth metadata', () => {
    expect(
      extractProfileFromMetadata({
        id: 'user-1',
        email: 'user@example.com',
        created_at: '2026-03-01T00:00:00.000Z',
        user_metadata: {
          nome: 'Maria',
          avatar_id: 'a1',
          municipio: 'Belo Horizonte',
        },
        app_metadata: {
          role: 'admin',
          microregiao_id: 'MR001',
          ativo: true,
        },
      })
    ).toEqual({
      id: 'user-1',
      nome: 'Maria',
      email: 'user@example.com',
      role: 'admin',
      microregiaoId: 'MR001',
      microregiaoIds: ['MR001'],
      ativo: true,
      lgpdConsentimento: true,
      avatarId: 'a1',
      municipio: 'Belo Horizonte',
      firstAccess: false,
      createdAt: '2026-03-01T00:00:00.000Z',
    });
  });

  it('resolves current microrregiao from viewing state or user state', () => {
    expect(
      getCurrentMicrorregiao(null, {
        id: 'u1',
        nome: 'Maria',
        email: 'user@example.com',
        role: 'gestor',
        microregiaoId: 'MR001',
        microregiaoIds: ['MR001'],
        ativo: true,
        lgpdConsentimento: true,
        avatarId: 'a1',
        firstAccess: false,
        createdAt: '2026-03-01T00:00:00.000Z',
      })
    )?.toMatchObject({
      id: 'MR001',
    });
  });
});
