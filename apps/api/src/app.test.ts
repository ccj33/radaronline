import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from './app.js';

test('GET /health returns service status', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.status, 'ok');
    assert.equal(payload.service, 'radar-api');
    assert.ok(payload.timestamp);
  } finally {
    await app.close();
  }
});

test('GET /v1/auth/session returns anonymous session without auth headers', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/session',
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.authenticated, false);
    assert.ok(payload.traceId);
  } finally {
    await app.close();
  }
});

test('GET /v1/auth/profile returns authenticated profile in development mode', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/profile',
      headers: {
        'x-dev-user-id': 'user-first-access',
        'x-dev-user-email': 'user@example.gov.br',
        'x-dev-user-name': 'Usuario Teste',
        'x-dev-user-role': 'usuario',
      },
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.id, 'user-first-access');
    assert.equal(payload.email, 'user@example.gov.br');
    assert.equal(payload.role, 'usuario');
  } finally {
    await app.close();
  }
});

test('GET /v1/users returns in-memory users for admin dev headers', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/users',
      headers: {
        'x-dev-user-id': 'seed-admin',
        'x-dev-user-email': 'admin@example.gov.br',
        'x-dev-user-name': 'Administrador',
        'x-dev-user-role': 'admin',
      },
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.ok(Array.isArray(payload.items));
  } finally {
    await app.close();
  }
});

test('POST /v1/users creates user in development mode with admin headers', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/users',
      headers: {
        'x-dev-user-id': 'seed-admin',
        'x-dev-user-email': 'admin@example.gov.br',
        'x-dev-user-name': 'Administrador',
        'x-dev-user-role': 'admin',
      },
      payload: {
        email: 'gestor@example.gov.br',
        password: '12345678',
        name: 'Gestor Teste',
        role: 'gestor',
        microregionId: 'MR001',
      },
    });

    assert.equal(response.statusCode, 201);
    const payload = response.json();
    assert.equal(payload.email, 'gestor@example.gov.br');
    assert.equal(payload.role, 'gestor');
    assert.equal(payload.microregionId, 'MR001');
  } finally {
    await app.close();
  }
});

test('POST /v1/users blocks admin from creating privileged roles', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/users',
      headers: {
        'x-dev-user-id': 'seed-admin',
        'x-dev-user-email': 'admin@example.gov.br',
        'x-dev-user-name': 'Administrador',
        'x-dev-user-role': 'admin',
      },
      payload: {
        email: 'admin.novo@example.gov.br',
        password: '12345678',
        name: 'Admin Novo',
        role: 'admin',
        microregionId: null,
      },
    });

    assert.equal(response.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('POST /v1/users allows superadmin to create another superadmin', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/users',
      headers: {
        'x-dev-user-id': 'seed-superadmin',
        'x-dev-user-email': 'superadmin@example.gov.br',
        'x-dev-user-name': 'Super Admin',
        'x-dev-user-role': 'superadmin',
      },
      payload: {
        email: 'super.novo@example.gov.br',
        password: '12345678',
        name: 'Super Novo',
        role: 'superadmin',
        microregionId: null,
      },
    });

    assert.equal(response.statusCode, 201);
    const payload = response.json();
    assert.equal(payload.role, 'superadmin');
  } finally {
    await app.close();
  }
});

test('POST /v1/users/import/preview normalizes exact microregions and flags fuzzy matches for review', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/users/import/preview',
      headers: {
        'x-dev-user-id': 'seed-admin',
        'x-dev-user-email': 'admin@example.gov.br',
        'x-dev-user-name': 'Administrador',
        'x-dev-user-role': 'admin',
      },
      payload: {
        rows: [
          {
            rowNumber: 1,
            name: 'Maria Teste',
            email: 'maria@example.gov.br',
            role: 'usuario',
            microregions: 'tres pontas',
          },
          {
            rowNumber: 2,
            name: 'Joao Teste',
            email: 'joao@example.gov.br',
            role: 'usuario',
            microregions: 'vargina',
          },
        ],
      },
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.summary.ready, 1);
    assert.equal(payload.summary.review, 1);
    assert.equal(payload.rows[0].normalizedMicroregionIds[0], 'MR011');
    assert.equal(payload.rows[1].status, 'review');
  } finally {
    await app.close();
  }
});

test('POST /v1/users/import/preview blocks privileged rows for admin actors', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/users/import/preview',
      headers: {
        'x-dev-user-id': 'seed-admin',
        'x-dev-user-email': 'admin@example.gov.br',
        'x-dev-user-name': 'Administrador',
        'x-dev-user-role': 'admin',
      },
      payload: {
        rows: [
          {
            rowNumber: 1,
            name: 'Admin Bloqueado',
            email: 'admin.bloqueado@example.gov.br',
            role: 'admin',
          },
        ],
      },
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.summary.error, 1);
    assert.match(payload.rows[0].issues[0], /Only superadmin can create or promote admin accounts/);
  } finally {
    await app.close();
  }
});

test('POST /v1/users/import/commit creates ready rows and returns csv output', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/users/import/commit',
      headers: {
        'x-dev-user-id': 'seed-admin',
        'x-dev-user-email': 'admin@example.gov.br',
        'x-dev-user-name': 'Administrador',
        'x-dev-user-role': 'admin',
      },
      payload: {
        loginUrl: 'https://radar.example.gov.br/login',
        rows: [
          {
            rowNumber: 1,
            name: 'Gestor Importado',
            email: 'gestor.importado@example.gov.br',
            role: 'gestor',
            microregions: 'MR011, 31012',
          },
          {
            rowNumber: 2,
            name: 'Linha Fuzzy',
            email: 'linha.fuzzy@example.gov.br',
            role: 'usuario',
            microregions: 'vargina',
          },
        ],
      },
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.summary.created, 1);
    assert.equal(payload.summary.skipped, 1);
    assert.ok(payload.csvFileName.endsWith('.csv'));
    assert.match(payload.csvContent, /gestor\.importado@example\.gov\.br/);
    assert.match(payload.csvContent, /senha_temporaria/);
    const createdRow = payload.rows.find(
      (row: { email: string; result: string; temporaryPassword: string | null }) =>
        row.email === 'gestor.importado@example.gov.br'
    );
    assert.equal(createdRow.result, 'created');
    assert.ok(createdRow.temporaryPassword);
  } finally {
    await app.close();
  }
});

test('POST /v1/auth/first-access/complete accepts self-service completion in development mode', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/first-access/complete',
      headers: {
        'x-dev-user-id': 'user-first-access',
        'x-dev-user-email': 'user@example.gov.br',
        'x-dev-user-name': 'Usuario Teste',
        'x-dev-user-role': 'usuario',
      },
      payload: {
        userId: 'user-first-access',
        userEmail: 'user@example.gov.br',
        municipio: 'Belo Horizonte',
        newPassword: '123456',
        microregionId: 'MR001',
      },
    });

    assert.equal(response.statusCode, 204);
  } finally {
    await app.close();
  }
});

test('POST /v1/tags creates and GET /v1/tags lists tags in development mode', async () => {
  const app = buildApp();
  try {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/tags',
      headers: {
        'x-dev-user-id': 'seed-admin',
        'x-dev-user-email': 'admin@example.gov.br',
        'x-dev-user-name': 'Administrador',
        'x-dev-user-role': 'admin',
      },
      payload: {
        name: 'Governanca',
      },
    });

    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json();
    assert.equal(created.name, 'GOVERNANCA');

    const listResponse = await app.inject({
      method: 'GET',
      url: '/v1/tags?microregionId=MR001',
      headers: {
        'x-dev-user-id': 'seed-admin',
        'x-dev-user-email': 'admin@example.gov.br',
        'x-dev-user-name': 'Administrador',
        'x-dev-user-role': 'admin',
      },
    });

    assert.equal(listResponse.statusCode, 200);
    const payload = listResponse.json();
    assert.ok(Array.isArray(payload.items));
    assert.ok(payload.items.some((item: { name: string }) => item.name === 'GOVERNANCA'));
  } finally {
    await app.close();
  }
});

test('POST /v1/teams creates and GET /v1/teams lists members in development mode', async () => {
  const app = buildApp();
  try {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/teams',
      headers: {
        'x-dev-user-id': 'seed-admin',
        'x-dev-user-email': 'admin@example.gov.br',
        'x-dev-user-name': 'Administrador',
        'x-dev-user-role': 'admin',
      },
      payload: {
        microregionId: 'MR001',
        name: 'Novo Colaborador',
        role: 'Membro',
        email: 'novo@example.gov.br',
        municipality: 'Belo Horizonte',
      },
    });

    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json();
    assert.equal(created.name, 'Novo Colaborador');
    assert.equal(created.microregionId, 'MR001');

    const listResponse = await app.inject({
      method: 'GET',
      url: '/v1/teams?microregionId=MR001',
      headers: {
        'x-dev-user-id': 'seed-admin',
        'x-dev-user-email': 'admin@example.gov.br',
        'x-dev-user-name': 'Administrador',
        'x-dev-user-role': 'admin',
      },
    });

    assert.equal(listResponse.statusCode, 200);
    const payload = listResponse.json();
    assert.ok(Array.isArray(payload.itemsByMicro.MR001));
    assert.ok(
      payload.itemsByMicro.MR001.some((item: { name: string }) => item.name === 'Novo Colaborador')
    );
  } finally {
    await app.close();
  }
});

test('POST /v1/objectives creates and GET /v1/activities returns grouped activities in development mode', async () => {
  const app = buildApp();
  try {
    const createObjectiveResponse = await app.inject({
      method: 'POST',
      url: '/v1/objectives',
      headers: {
        'x-dev-user-id': 'seed-admin',
        'x-dev-user-email': 'admin@example.gov.br',
        'x-dev-user-name': 'Administrador',
        'x-dev-user-role': 'admin',
      },
      payload: {
        title: 'Objetivo API',
        microregionId: 'MR001',
      },
    });

    assert.equal(createObjectiveResponse.statusCode, 201);
    const objective = createObjectiveResponse.json();

    const createActivityResponse = await app.inject({
      method: 'POST',
      url: '/v1/activities',
      headers: {
        'x-dev-user-id': 'seed-admin',
        'x-dev-user-email': 'admin@example.gov.br',
        'x-dev-user-name': 'Administrador',
        'x-dev-user-role': 'admin',
      },
      payload: {
        objectiveId: objective.id,
        id: `${objective.id}.1`,
        title: 'Atividade API',
        microregionId: 'MR001',
        description: 'Descricao',
      },
    });

    assert.equal(createActivityResponse.statusCode, 201);

    const listActivitiesResponse = await app.inject({
      method: 'GET',
      url: '/v1/activities?microregionId=MR001',
      headers: {
        'x-dev-user-id': 'seed-admin',
        'x-dev-user-email': 'admin@example.gov.br',
        'x-dev-user-name': 'Administrador',
        'x-dev-user-role': 'admin',
      },
    });

    assert.equal(listActivitiesResponse.statusCode, 200);
    const payload = listActivitiesResponse.json();
    assert.ok(Array.isArray(payload.itemsByObjective[String(objective.id)]));
    assert.ok(
      payload.itemsByObjective[String(objective.id)].some(
        (item: { title: string }) => item.title === 'Atividade API'
      )
    );
  } finally {
    await app.close();
  }
});

test('POST /v1/requests ignores spoofed userId and binds the request to the authenticated actor', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/requests',
      headers: {
        'x-dev-user-id': 'user-first-access',
        'x-dev-user-email': 'user@example.gov.br',
        'x-dev-user-name': 'Usuario Teste',
        'x-dev-user-role': 'usuario',
        'x-dev-user-microregion-id': 'MR001',
      },
      payload: {
        userId: 'spoofed-user',
        requestType: 'support',
        content: 'Teste de integridade',
      },
    });

    assert.equal(response.statusCode, 201);
    const payload = response.json();
    assert.equal(payload.user_id, 'user-first-access');
  } finally {
    await app.close();
  }
});

test('POST /v1/tags blocks non-admin catalog mutation', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/tags',
      headers: {
        'x-dev-user-id': 'user-first-access',
        'x-dev-user-email': 'user@example.gov.br',
        'x-dev-user-name': 'Usuario Teste',
        'x-dev-user-role': 'usuario',
        'x-dev-user-microregion-id': 'MR001',
      },
      payload: {
        name: 'Governanca Local',
      },
    });

    assert.equal(response.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('GET /v1/actions/:actionUid blocks gestor access outside the actor microregion', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/actions/MR000::1.1.1',
      headers: {
        'x-dev-user-id': 'gestor-mr001',
        'x-dev-user-email': 'gestor@example.gov.br',
        'x-dev-user-name': 'Gestor MR001',
        'x-dev-user-role': 'gestor',
        'x-dev-user-microregion-id': 'MR001',
      },
    });

    assert.equal(response.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('GET /v1/teams/status blocks user lookup for another email outside the actor scope', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/teams/status?email=admin@example.gov.br',
      headers: {
        'x-dev-user-id': 'user-first-access',
        'x-dev-user-email': 'user@example.gov.br',
        'x-dev-user-name': 'Usuario Teste',
        'x-dev-user-role': 'usuario',
        'x-dev-user-microregion-id': 'MR001',
      },
    });

    assert.equal(response.statusCode, 403);
  } finally {
    await app.close();
  }
});
