import { randomInt } from 'node:crypto';

import type { SessionUser, UserRole } from '../../shared/auth/auth.types.js';
import {
  isGlobalMicroregionMarker,
  resolveMicroregion,
  splitMicroregionInput,
  type MicroregionMatchStatus,
} from '../../shared/domain/microregions.resolver.js';
import {
  canActorAssignUserRole,
  getRoleAssignmentForbiddenMessage,
} from './users.policy.js';
import type { UsersRepository } from './users.repository.js';

const MAX_IMPORT_ROWS = 500;
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const ROLE_ALIASES: Record<string, UserRole> = {
  superadmin: 'superadmin',
  'super admin': 'superadmin',
  'super-admin': 'superadmin',
  admin: 'admin',
  administrador: 'admin',
  administradora: 'admin',
  gestor: 'gestor',
  gestora: 'gestor',
  usuario: 'usuario',
  usuarioa: 'usuario',
  'usu ario': 'usuario',
  'usu rio': 'usuario',
};

type PreviewRowStatus = 'ready' | 'review' | 'error' | 'duplicate';
type CommitRowResult = 'created' | 'skipped' | 'failed';

export interface UserImportInputRow {
  rowNumber?: number;
  name?: string;
  email?: string;
  role?: string;
  microregions?: string;
  municipality?: string;
}

export interface UserImportMicroregionResolution {
  input: string;
  status: MicroregionMatchStatus;
  id: string | null;
  code: string | null;
  name: string | null;
  suggestions: string[];
}

export interface UserImportPreviewRow {
  rowNumber: number;
  name: string;
  email: string;
  roleInput: string;
  role: UserRole | null;
  microregionsInput: string;
  municipality: string | null;
  normalizedMicroregionIds: string[];
  normalizedMicroregionNames: string[];
  microregions: UserImportMicroregionResolution[];
  status: PreviewRowStatus;
  issues: string[];
  warnings: string[];
}

export interface UserImportPreviewResult {
  rows: UserImportPreviewRow[];
  summary: {
    total: number;
    ready: number;
    review: number;
    error: number;
    duplicate: number;
  };
}

export interface UserImportCommitRow extends UserImportPreviewRow {
  result: CommitRowResult;
  userId: string | null;
  temporaryPassword: string | null;
  loginUrl: string | null;
}

export interface UserImportCommitResult {
  rows: UserImportCommitRow[];
  summary: {
    total: number;
    created: number;
    skipped: number;
    failed: number;
  };
  csvFileName: string;
  csvContent: string;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeRole(value: string): UserRole | null {
  const normalized = normalizeText(value);
  return ROLE_ALIASES[normalized] || null;
}

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function assertActorCanManageUsers(actor: SessionUser): void {
  if (actor.role !== 'admin' && actor.role !== 'superadmin') {
    throw new Error('FORBIDDEN');
  }
}

function assertImportSize(rows: UserImportInputRow[]): void {
  if (rows.length === 0) {
    throw new Error('EMPTY_IMPORT');
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error('IMPORT_LIMIT_EXCEEDED');
  }
}

function createTemporaryPassword(): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%*?';
  const all = `${uppercase}${lowercase}${digits}${symbols}`;

  const chars = [
    uppercase[randomInt(uppercase.length)],
    lowercase[randomInt(lowercase.length)],
    digits[randomInt(digits.length)],
    symbols[randomInt(symbols.length)],
  ];

  while (chars.length < 14) {
    chars.push(all[randomInt(all.length)]);
  }

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    const current = chars[index];
    chars[index] = chars[swapIndex];
    chars[swapIndex] = current;
  }

  return chars.join('');
}

function toMicroregionStorage(role: UserRole, microregionIds: string[]): string | null {
  if (role === 'admin' || role === 'superadmin') {
    return null;
  }

  return microregionIds.join(',');
}

function escapeCsvCell(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function buildCsv(rows: UserImportCommitRow[]): string {
  const header = [
    'status',
    'linha',
    'nome',
    'email',
    'role',
    'microrregioes_informadas',
    'microrregioes_normalizadas',
    'municipio',
    'url_login',
    'senha_temporaria',
    'observacoes',
  ];

  const data = rows.map((row) => {
    const observations = [...row.issues, ...row.warnings].join(' | ');
    return [
      row.result,
      String(row.rowNumber),
      row.name,
      row.email,
      row.role || row.roleInput,
      row.microregionsInput,
      row.normalizedMicroregionNames
        .map((name, index) => `${row.normalizedMicroregionIds[index]} - ${name}`)
        .join(' | '),
      row.municipality || '',
      row.loginUrl || '',
      row.temporaryPassword || '',
      observations,
    ]
      .map((value) => escapeCsvCell(value))
      .join(',');
  });

  return [header.join(','), ...data].join('\n');
}

async function findExistingEmails(
  repository: UsersRepository,
  rows: Array<{ email: string }>
): Promise<Set<string>> {
  const emails = [...new Set(rows.map((row) => row.email).filter(Boolean))];
  const found = new Set<string>();

  await Promise.all(
    emails.map(async (email) => {
      const user = await repository.getByEmail(email);
      if (user) {
        found.add(email);
      }
    })
  );

  return found;
}

export class UsersImportService {
  constructor(private readonly repository: UsersRepository) {}

  async preview(actor: SessionUser, inputRows: UserImportInputRow[]): Promise<UserImportPreviewResult> {
    assertActorCanManageUsers(actor);
    assertImportSize(inputRows);

    const normalizedRows = inputRows.map((row, index) => ({
      rowNumber: row.rowNumber || index + 1,
      name: (row.name || '').trim(),
      email: (row.email || '').trim().toLowerCase(),
      roleInput: (row.role || '').trim(),
      microregionsInput: (row.microregions || '').trim(),
      municipality: (row.municipality || '').trim(),
    }));

    const existingEmails = await findExistingEmails(this.repository, normalizedRows);
    const seenEmails = new Set<string>();

    const rows = normalizedRows.map((row) => {
      const issues: string[] = [];
      const warnings: string[] = [];
      const role = normalizeRole(row.roleInput);
      const microregions: UserImportMicroregionResolution[] = [];
      const normalizedMicroregionIds: string[] = [];
      const normalizedMicroregionNames: string[] = [];

      if (!row.name) {
        issues.push('Nome obrigatorio.');
      }

      if (!row.email) {
        issues.push('Email obrigatorio.');
      } else if (!isValidEmail(row.email)) {
        issues.push('Email invalido.');
      }

      if (!role) {
        issues.push('Nivel de acesso invalido.');
      } else if (!canActorAssignUserRole(actor.role, role)) {
        issues.push(getRoleAssignmentForbiddenMessage(role));
      }

      if (row.email) {
        if (seenEmails.has(row.email)) {
          issues.push('Email repetido dentro do lote.');
        } else {
          seenEmails.add(row.email);
        }

        if (existingEmails.has(row.email)) {
          issues.push('Email ja cadastrado no sistema.');
        }
      }

      if (role) {
        if (role === 'admin' || role === 'superadmin') {
          if (row.microregionsInput && !isGlobalMicroregionMarker(row.microregionsInput)) {
            warnings.push('Roles administrativos nao devem receber microrregiao. Revise a linha.');
          }
        } else {
          const tokens = splitMicroregionInput(row.microregionsInput);

          if (tokens.length === 0) {
            issues.push('Microrregiao obrigatoria para gestor e usuario.');
          }

          for (const token of tokens) {
            const resolved = resolveMicroregion(token);
            microregions.push(resolved);

            if (resolved.id && resolved.name) {
              if (!normalizedMicroregionIds.includes(resolved.id)) {
                normalizedMicroregionIds.push(resolved.id);
                normalizedMicroregionNames.push(resolved.name);
              }
            }

            if (resolved.status === 'fuzzy') {
              warnings.push(
                `Microrregiao "${token}" foi aproximada para ${resolved.id} - ${resolved.name}.`
              );
            }

            if (resolved.status === 'ambiguous') {
              issues.push(
                `Microrregiao "${token}" esta ambigua. Sugestoes: ${resolved.suggestions.join(', ')}.`
              );
            }

            if (resolved.status === 'none') {
              issues.push(`Microrregiao "${token}" nao foi encontrada.`);
            }
          }

          if (role === 'usuario' && normalizedMicroregionIds.length > 1) {
            issues.push('Usuario deve ter exatamente uma microrregiao.');
          }
        }
      }

      let status: PreviewRowStatus = 'ready';
      const duplicateOnly =
        issues.length > 0 &&
        issues.every((issue) =>
          issue === 'Email repetido dentro do lote.' || issue === 'Email ja cadastrado no sistema.'
        );

      if (duplicateOnly) {
        status = 'duplicate';
      } else if (issues.length > 0) {
        status = 'error';
      } else if (warnings.length > 0) {
        status = 'review';
      }

      return {
        rowNumber: row.rowNumber,
        name: row.name,
        email: row.email,
        roleInput: row.roleInput,
        role,
        microregionsInput: row.microregionsInput,
        municipality: row.municipality || null,
        normalizedMicroregionIds,
        normalizedMicroregionNames,
        microregions,
        status,
        issues,
        warnings,
      } satisfies UserImportPreviewRow;
    });

    return {
      rows,
      summary: {
        total: rows.length,
        ready: rows.filter((row) => row.status === 'ready').length,
        review: rows.filter((row) => row.status === 'review').length,
        error: rows.filter((row) => row.status === 'error').length,
        duplicate: rows.filter((row) => row.status === 'duplicate').length,
      },
    };
  }

  async commit(
    actor: SessionUser,
    inputRows: UserImportInputRow[],
    loginUrl: string | null
  ): Promise<UserImportCommitResult> {
    const preview = await this.preview(actor, inputRows);

    const rows: UserImportCommitRow[] = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of preview.rows) {
      if (row.status !== 'ready' || !row.role) {
        skipped += 1;
        rows.push({
          ...row,
          result: 'skipped',
          userId: null,
          temporaryPassword: null,
          loginUrl,
        });
        continue;
      }

      try {
        const temporaryPassword = createTemporaryPassword();
        const createdUser = await this.repository.create({
          email: row.email,
          password: temporaryPassword,
          name: row.name,
          role: row.role,
          microregionId: toMicroregionStorage(row.role, row.normalizedMicroregionIds),
          createdBy: actor.id,
        });

        created += 1;
        rows.push({
          ...row,
          result: 'created',
          userId: createdUser.id,
          temporaryPassword,
          loginUrl,
        });
      } catch (error) {
        failed += 1;
        rows.push({
          ...row,
          result: 'failed',
          userId: null,
          temporaryPassword: null,
          loginUrl,
          issues: [
            ...row.issues,
            error instanceof Error ? error.message : 'Falha inesperada ao criar usuario.',
          ],
        });
      }
    }

    const csvFileName = `radar-user-import-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;

    return {
      rows,
      summary: {
        total: rows.length,
        created,
        skipped,
        failed,
      },
      csvFileName,
      csvContent: buildCsv(rows),
    };
  }
}
