import { describe, expect, it } from 'vitest';

import {
  buildCreateRequestBatchPayload,
  buildCreateRequestPayload,
  buildPendingMemberRequestContent,
  buildUpdateRequestPayload,
  dedupeManagedRequestsByContentKey,
  dedupeRequestsById,
  getMissingRequestProfileIds,
  getRequestRequesterLabel,
  getRequestResponderLabel,
  getUniqueRequestProfileIds,
  mergeRequestsWithProfiles,
  shouldCreateOwnRequestViaBackend,
} from './requestsService.helpers';
import type { UserRequest } from './requestsService.types';

describe('requestsService.helpers', () => {
  it('deduplicates request profile ids', () => {
    expect(
      getUniqueRequestProfileIds([
        {
          id: '1',
          user_id: 'u1',
          request_type: 'support',
          content: 'a',
          status: 'pending',
          admin_notes: null,
          created_at: '2026-03-01',
        },
        {
          id: '2',
          user_id: 'u1',
          request_type: 'feedback',
          content: 'b',
          status: 'pending',
          admin_notes: null,
          created_at: '2026-03-01',
        },
        {
          id: '3',
          user_id: 'u2',
          request_type: 'support',
          content: 'c',
          status: 'resolved',
          admin_notes: null,
          resolved_by: 'admin-1',
          created_at: '2026-03-01',
        },
      ])
    ).toEqual(['u1', 'u2', 'admin-1']);
  });

  it('merges request profile and responder details', () => {
    expect(
      mergeRequestsWithProfiles(
        [
          {
            id: '1',
            user_id: 'u1',
            request_type: 'support',
            content: 'a',
            status: 'resolved',
            admin_notes: null,
            resolved_by: 'admin-1',
            created_at: '2026-03-01',
          },
        ],
        new Map([
          [
            'u1',
            {
              id: 'u1',
              nome: 'Maria',
              email: 'maria@example.com',
              role: 'admin',
              cargo: 'Gestora',
              municipio: 'Belo Horizonte',
              microregiao_id: 'MR1',
            },
          ],
          [
            'admin-1',
            {
              id: 'admin-1',
              nome: 'Admin Radar',
              email: 'admin@example.com',
              role: 'admin',
              cargo: 'Coordenador',
              municipio: 'Belo Horizonte',
              microregiao_id: 'MR1',
            },
          ],
        ])
      )
    ).toEqual([
      {
        id: '1',
        user_id: 'u1',
        request_type: 'support',
        content: 'a',
        status: 'resolved',
        admin_notes: null,
        resolved_by: 'admin-1',
        created_at: '2026-03-01',
        resolved_by_name: 'Admin Radar',
        user: {
          nome: 'Maria',
          email: 'maria@example.com',
          role: 'admin',
          cargo: 'Gestora',
          municipio: 'Belo Horizonte',
          microregiao_id: 'MR1',
        },
      },
    ]);
  });

  it('preserves joined names when the fallback profile lookup is empty', () => {
    expect(
      mergeRequestsWithProfiles(
        [
          {
            id: '1',
            user_id: 'u1',
            request_type: 'support',
            content: 'a',
            status: 'resolved',
            admin_notes: null,
            resolved_by: 'admin-1',
            resolved_by_name: 'Admin Radar',
            created_at: '2026-03-01',
            user: {
              nome: 'Maria',
              email: 'maria@example.com',
              role: 'admin',
              cargo: 'Gestora',
              municipio: 'Belo Horizonte',
              microregiao_id: 'MR1',
            },
          },
        ],
        new Map()
      )
    ).toEqual([
      {
        id: '1',
        user_id: 'u1',
        request_type: 'support',
        content: 'a',
        status: 'resolved',
        admin_notes: null,
        resolved_by: 'admin-1',
        resolved_by_name: 'Admin Radar',
        created_at: '2026-03-01',
        user: {
          nome: 'Maria',
          email: 'maria@example.com',
          role: 'admin',
          cargo: 'Gestora',
          municipio: 'Belo Horizonte',
          microregiao_id: 'MR1',
        },
      },
    ]);
  });

  it('detects only the profile ids still missing after relational select', () => {
    expect(
      getMissingRequestProfileIds([
        {
          id: '1',
          user_id: 'u1',
          request_type: 'support',
          content: 'a',
          status: 'pending',
          admin_notes: null,
          created_at: '2026-03-01',
          user: {
            nome: 'Maria',
            email: 'maria@example.com',
            role: 'gestor',
            municipio: null,
            microregiao_id: 'MR1',
          },
        },
        {
          id: '2',
          user_id: 'u2',
          request_type: 'feedback',
          content: 'b',
          status: 'resolved',
          admin_notes: null,
          created_at: '2026-03-01',
          resolved_by: 'admin-2',
        },
      ])
    ).toEqual(['u2', 'admin-2']);
  });

  it('deduplicates requests keeping the richer payload for the same id', () => {
    expect(
      dedupeRequestsById([
        {
          id: 'req-1',
          user_id: 'u1',
          request_type: 'support',
          content: 'a',
          status: 'pending',
          admin_notes: null,
          created_at: '2026-03-02',
        },
        {
          id: 'req-1',
          user_id: 'u1',
          request_type: 'support',
          content: 'a',
          status: 'pending',
          admin_notes: null,
          created_at: '2026-03-02',
          user: {
            nome: 'Maria',
            email: 'maria@example.com',
            role: 'gestor',
            municipio: 'Belo Horizonte',
            microregiao_id: 'MR1',
          },
        },
      ])
    ).toEqual([
      {
        id: 'req-1',
        user_id: 'u1',
        request_type: 'support',
        content: 'a',
        status: 'pending',
        admin_notes: null,
        created_at: '2026-03-02',
        resolved_by_name: null,
        user: {
          nome: 'Maria',
          email: 'maria@example.com',
          role: 'gestor',
          municipio: 'Belo Horizonte',
          microregiao_id: 'MR1',
        },
      },
    ]);
  });

  it('uses short ids as last-resort labels when names are not available', () => {
    expect(
      getRequestRequesterLabel({
        user_id: '2350e7b0-419f-4995-8b0e-36e7988d38a5',
      })
    ).toBe('Usuario 2350e7b0');

    expect(
      getRequestResponderLabel({
        resolved_by: '80f962f6-c3b8-49f5-a95d-9a077b17d948',
      })
    ).toBe('Admin 80f962f6');
  });

  it('builds request update payload correctly', () => {
    expect(
      buildUpdateRequestPayload('resolved', 'ok', 'admin-1', '2026-03-01T12:00:00.000Z')
    ).toEqual({
      status: 'resolved',
      updated_at: '2026-03-01T12:00:00.000Z',
      resolved_by: 'admin-1',
      resolved_at: '2026-03-01T12:00:00.000Z',
      admin_notes: 'ok',
    });
  });

  it('builds single and batch create payloads trimming content', () => {
    expect(buildCreateRequestPayload('u1', 'support', '  ajuda  ')).toEqual({
      user_id: 'u1',
      request_type: 'support',
      content: 'ajuda',
      status: 'pending',
    });

    expect(
      buildCreateRequestBatchPayload([
        {
          userId: 'u1',
          requestType: 'support',
          content: '  ajuda  ',
        },
      ])
    ).toEqual([
      {
        user_id: 'u1',
        request_type: 'support',
        content: 'ajuda',
        status: 'pending',
        admin_notes: null,
      },
    ]);
  });

  it('uses backend request creation only for the authenticated owner', () => {
    expect(
      shouldCreateOwnRequestViaBackend({
        backendRequestsEnabled: true,
        currentUserId: 'user-1',
        targetUserId: 'user-1',
      })
    ).toBe(true);

    expect(
      shouldCreateOwnRequestViaBackend({
        backendRequestsEnabled: true,
        currentUserId: 'user-1',
        targetUserId: 'user-2',
      })
    ).toBe(false);

    expect(
      shouldCreateOwnRequestViaBackend({
        backendRequestsEnabled: false,
        currentUserId: 'user-1',
        targetUserId: 'user-1',
      })
    ).toBe(false);
  });

  it('colapsa na Central só alertas de membro pendente repetidos, não dois tickets support iguais', () => {
    const content = buildPendingMemberRequestContent('ff', 'ffff@gmail.com', 'MR016');
    const pendingMember = {
      id: 'p1',
      user_id: 'admin-a',
      request_type: 'request',
      content,
      status: 'pending' as const,
      admin_notes: null,
      created_at: '2026-04-09T12:00:00Z',
    };
    const supportA = {
      id: 's1',
      user_id: 'u1',
      request_type: 'support',
      content: 'texto identico',
      status: 'pending' as const,
      admin_notes: null,
      created_at: '2026-04-09T11:00:00Z',
    };
    const supportB = { ...supportA, id: 's2', user_id: 'u2' };

    const out = dedupeManagedRequestsByContentKey([
      pendingMember,
      { ...pendingMember, id: 'p2', user_id: 'admin-b' },
      supportA,
      supportB,
    ] as UserRequest[]);

    expect(out).toHaveLength(3);
  });
});
