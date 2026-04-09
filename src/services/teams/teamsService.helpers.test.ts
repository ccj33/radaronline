import { describe, expect, it } from 'vitest';

import {
  mapPendingRegistration,
  mergeProfilesAndTeams,
  normalizeEmail,
} from './teamsService.helpers';
import type {
  PendingRegistrationRow,
  TeamDTO,
  TeamProfileRow,
} from './teamsService.types';

describe('teamsService.helpers', () => {
  it('normaliza email com trim e lowercase', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
    expect(normalizeEmail(null)).toBe('');
  });

  it('mescla perfis e equipes sem duplicar usuario ja cadastrado na mesma micro', () => {
    const profiles: TeamProfileRow[] = [
      {
        id: 'profile-1',
        nome: 'Ana',
        email: 'ana@example.com',
        municipio: 'Belo Horizonte',
        microregiao_id: 'micro-1',
        role: 'Gestora',
      },
    ];

    const teams: TeamDTO[] = [
      {
        id: 'team-1',
        microregiao_id: 'micro-1',
        name: 'Ana',
        cargo: 'Gestora',
        email: 'ana@example.com',
        municipio: 'Contagem',
        profile_id: 'profile-1',
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
      },
      {
        id: 'team-2',
        microregiao_id: 'micro-1',
        name: 'Bruno',
        cargo: 'Membro',
        email: 'bruno@example.com',
        municipio: null,
        profile_id: null,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
      },
    ];

    const result = mergeProfilesAndTeams(profiles, teams);

    expect(result['micro-1']).toHaveLength(2);
    expect(result['micro-1'][0]).toMatchObject({
      id: 'profile-1',
      email: 'ana@example.com',
      municipio: 'Contagem',
      isRegistered: true,
    });
    expect(result['micro-1'][1]).toMatchObject({
      id: 'team-2',
      email: 'bruno@example.com',
      municipio: 'Sede/Remoto',
      isRegistered: false,
    });
  });

  it('marca como cadastrado se o perfil ativo existe noutra microrregiao mas o email bate com teams', () => {
    const profiles: TeamProfileRow[] = [
      {
        id: 'profile-outra',
        nome: 'Diana',
        email: 'diana@example.com',
        municipio: 'X',
        microregiao_id: 'micro-2',
        role: 'usuario',
      },
    ];

    const teams: TeamDTO[] = [
      {
        id: 'team-d',
        microregiao_id: 'micro-1',
        name: 'Diana',
        cargo: 'Membro',
        email: 'diana@example.com',
        municipio: 'Y',
        profile_id: null,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
      },
    ];

    const result = mergeProfilesAndTeams(profiles, teams);
    const dianaNoTime = result['micro-1']?.find((m) => m.email === 'diana@example.com');
    expect(dianaNoTime?.isRegistered).toBe(true);
  });

  it('profile_id na linha de teams marca registrado mesmo sem perfil na lista filtrada', () => {
    const teams: TeamDTO[] = [
      {
        id: 'team-x',
        microregiao_id: 'micro-1',
        name: 'Eva',
        cargo: 'Membro',
        email: 'eva@example.com',
        municipio: null,
        profile_id: 'profile-eva-uuid',
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
      },
    ];

    const result = mergeProfilesAndTeams([], teams);
    expect(result['micro-1'][0].isRegistered).toBe(true);
  });

  it('mapeia registro pendente com cargo padrao', () => {
    const row: PendingRegistrationRow = {
      id: 'pending-1',
      name: 'Carlos',
      email: 'carlos@example.com',
      municipio: null,
      microregiao_id: 'micro-2',
      cargo: null,
      created_at: '2026-03-01T00:00:00Z',
    };

    expect(mapPendingRegistration(row)).toEqual({
      id: 'pending-1',
      name: 'Carlos',
      email: 'carlos@example.com',
      municipio: null,
      microregiaoId: 'micro-2',
      cargo: 'Membro',
      createdAt: '2026-03-01T00:00:00Z',
    });
  });
});
