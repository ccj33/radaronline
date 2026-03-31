import { describe, expect, it } from 'vitest';

import {
  buildCreateRequestBatchPayload,
  buildCreateRequestPayload,
  buildUpdateRequestPayload,
  getUniqueRequestProfileIds,
  mergeRequestsWithProfiles,
  shouldCreateOwnRequestViaBackend,
} from './requestsService.helpers';

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
});
