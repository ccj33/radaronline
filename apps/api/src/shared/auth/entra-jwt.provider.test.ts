import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractRoleFromClaims,
  mapEntraPayloadToSessionUser,
} from './entra-jwt.provider.js';

test('extractRoleFromClaims normalizes known roles', () => {
  assert.equal(extractRoleFromClaims({ roles: ['Radar.Admin'] }, 'roles'), 'admin');
  assert.equal(extractRoleFromClaims({ roles: 'gestor' }, 'roles'), 'gestor');
  assert.equal(extractRoleFromClaims({ roles: 'unknown' }, 'roles'), 'usuario');
});

test('mapEntraPayloadToSessionUser maps identity claims into session user', () => {
  const sessionUser = mapEntraPayloadToSessionUser(
    {
      oid: 'oid-123',
      preferred_username: 'user@example.gov.br',
      name: 'Example User',
      roles: ['superadmin'],
    },
    'roles'
  );

  assert.deepEqual(sessionUser, {
    id: 'oid-123',
    email: 'user@example.gov.br',
    name: 'Example User',
    role: 'superadmin',
    microregionId: null,
    microregionIds: [],
  });
});
