import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./adminUsersApi', () => ({
  commitUsersImportViaBackendApi: vi.fn(),
  previewUsersImportViaBackendApi: vi.fn(),
}));

vi.mock('./authService', () => ({
  createUser: vi.fn(),
  listUsers: vi.fn(),
}));

vi.mock('./teamsService', () => ({
  saveUserMunicipality: vi.fn(),
}));

import { commitUsersImport, getAdminUserImportMode, previewUsersImport } from './adminUserImportService';
import { createUser, listUsers } from './authService';
import { saveUserMunicipality } from './teamsService';

describe('adminUserImportService', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('uses the legacy preview path when the backend admin API is not configured', async () => {
    vi.stubEnv('VITE_BACKEND_API_URL', '');
    vi.mocked(listUsers).mockResolvedValue([]);

    const preview = await previewUsersImport(
      [
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
      'admin'
    );

    expect(getAdminUserImportMode()).toBe('legacy');
    expect(preview.summary).toEqual({
      total: 2,
      ready: 1,
      review: 1,
      error: 0,
      duplicate: 0,
    });
    expect(preview.rows[0].normalizedMicroregionIds).toEqual(['MR011']);
    expect(preview.rows[1].status).toBe('review');
    expect(preview.rows[1].warnings[0]).toContain('vargina');
  });

  it('creates only ready rows in legacy mode and returns an operational csv', async () => {
    vi.stubEnv('VITE_BACKEND_API_URL', '');
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(createUser).mockResolvedValue({
      id: 'user-1',
      nome: 'Gestor Importado',
      email: 'gestor.importado@example.gov.br',
      role: 'gestor',
      microregiaoId: 'MR011',
      microregiaoIds: ['MR011'],
      ativo: true,
      avatarId: 'zg10',
      lgpdConsentimento: false,
      firstAccess: true,
      createdAt: '2026-03-30T00:00:00.000Z',
    });
    vi.mocked(saveUserMunicipality).mockResolvedValue(undefined);

    const result = await commitUsersImport({
      loginUrl: 'https://radar.example.gov.br/login',
      actorRole: 'admin',
      rows: [
        {
          rowNumber: 1,
          name: 'Gestor Importado',
          email: 'gestor.importado@example.gov.br',
          role: 'gestor',
          microregions: 'MR011',
          municipality: 'Tres Pontas',
        },
        {
          rowNumber: 2,
          name: 'Linha Fuzzy',
          email: 'linha.fuzzy@example.gov.br',
          role: 'usuario',
          microregions: 'vargina',
        },
      ],
    });

    expect(createUser).toHaveBeenCalledTimes(1);
    expect(createUser).toHaveBeenCalledWith({
      nome: 'Gestor Importado',
      email: 'gestor.importado@example.gov.br',
      senha: expect.any(String),
      role: 'gestor',
      microregiaoId: 'MR011',
    });
    expect(saveUserMunicipality).toHaveBeenCalledWith(
      'MR011',
      'gestor.importado@example.gov.br',
      'Tres Pontas',
      'Gestor Importado'
    );
    expect(result.summary).toEqual({
      total: 2,
      created: 1,
      skipped: 1,
      failed: 0,
    });
    expect(result.csvContent).toContain('senha_temporaria');
    expect(result.csvContent).toContain('gestor.importado@example.gov.br');
    expect(result.rows[0].temporaryPassword).toBeTruthy();
    expect(result.rows[1].result).toBe('skipped');
  });

  it('blocks admin actors from importing admin rows while allowing superadmin rows', async () => {
    vi.stubEnv('VITE_BACKEND_API_URL', '');
    vi.mocked(listUsers).mockResolvedValue([]);

    const blockedPreview = await previewUsersImport(
      [
        {
          rowNumber: 1,
          name: 'Admin Bloqueado',
          email: 'admin.bloqueado@example.gov.br',
          role: 'admin',
        },
      ],
      'admin'
    );

    expect(blockedPreview.summary.error).toBe(1);
    expect(blockedPreview.rows[0].issues).toContain(
      'Apenas o Super Admin pode criar ou promover administradores.'
    );

    const superadminPreview = await previewUsersImport(
      [
        {
          rowNumber: 1,
          name: 'Super Novo',
          email: 'super.novo@example.gov.br',
          role: 'superadmin',
        },
      ],
      'superadmin'
    );

    expect(superadminPreview.summary.ready).toBe(1);
    expect(superadminPreview.rows[0].status).toBe('ready');
  });
});
