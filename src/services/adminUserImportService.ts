import { MICROREGIOES, type Microrregiao } from '../data/microregioes';
import type { UserRole } from '../types/auth.types';
import {
  canAssignAdminRole,
  getAdminRoleAssignmentError,
} from '../lib/adminRolePolicy';

import {
  commitUsersImportViaBackendApi,
  previewUsersImportViaBackendApi,
  type UserImportCommitResponse,
  type UserImportCommitRow,
  type UserImportInputRow,
  type UserImportMicroregionResolution,
  type UserImportPreviewResponse,
  type UserImportPreviewRow,
} from './adminUsersApi';
import { isLegacySupabaseAdminFlowDisabled, shouldUseBackendAdminUsersApi } from './apiClient';
import { createUser, listUsers } from './authService';
import { saveUserMunicipality } from './teamsService';

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
};

const GLOBAL_MICROREGION_MARKERS = new Set([
  '',
  'all',
  'todas',
  'todos',
  'global',
  'estado',
  'minas gerais',
  'mg',
]);

type IndexedMicroregion = Microrregiao & {
  normalizedName: string;
  aliases: string[];
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeCompact(value: string): string {
  return normalizeText(value).replace(/\s+/g, '');
}

function buildAliases(entry: Microrregiao): string[] {
  const aliases = new Set<string>();
  aliases.add(normalizeText(entry.nome));

  for (const segment of entry.nome.split('/')) {
    const normalizedSegment = normalizeText(segment);
    if (normalizedSegment) {
      aliases.add(normalizedSegment);
    }
  }

  return Array.from(aliases);
}

const INDEXED_MICROREGIONS: IndexedMicroregion[] = MICROREGIOES.map((entry) => ({
  ...entry,
  normalizedName: normalizeText(entry.nome),
  aliases: buildAliases(entry),
}));

function levenshteinDistance(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row;
  }

  for (let col = 0; col < cols; col += 1) {
    matrix[0][col] = col;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[left.length][right.length];
}

function isGlobalMicroregionMarker(value: string): boolean {
  return GLOBAL_MICROREGION_MARKERS.has(normalizeText(value));
}

function splitMicroregionInput(value: string): string[] {
  return value
    .split(/[|,;]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveMicroregion(input: string): UserImportMicroregionResolution {
  const normalized = normalizeText(input);
  const compact = normalizeCompact(input);

  if (!normalized) {
    return {
      input,
      status: 'none',
      id: null,
      code: null,
      name: null,
      suggestions: [],
    };
  }

  const byId = INDEXED_MICROREGIONS.find((entry) => normalizeCompact(entry.id) === compact);
  if (byId) {
    return {
      input,
      status: 'exact-id',
      id: byId.id,
      code: byId.codigo,
      name: byId.nome,
      suggestions: [],
    };
  }

  const byCode = INDEXED_MICROREGIONS.find((entry) => normalizeCompact(entry.codigo) === compact);
  if (byCode) {
    return {
      input,
      status: 'exact-code',
      id: byCode.id,
      code: byCode.codigo,
      name: byCode.nome,
      suggestions: [],
    };
  }

  const exactAliasMatches = INDEXED_MICROREGIONS.filter((entry) => entry.aliases.includes(normalized));
  if (exactAliasMatches.length === 1) {
    const [match] = exactAliasMatches;
    return {
      input,
      status: match.normalizedName === normalized ? 'exact-name' : 'exact-alias',
      id: match.id,
      code: match.codigo,
      name: match.nome,
      suggestions: [],
    };
  }

  if (exactAliasMatches.length > 1) {
    return {
      input,
      status: 'ambiguous',
      id: null,
      code: null,
      name: null,
      suggestions: exactAliasMatches.map((entry) => `${entry.id} - ${entry.nome}`),
    };
  }

  const scoredMatches = INDEXED_MICROREGIONS.map((entry) => {
    const bestAlias = entry.aliases.reduce(
      (current, alias) => {
        if (alias.length < 3 || normalized.length < 3) {
          return current;
        }

        const distance = levenshteinDistance(normalized, alias);
        if (!current || distance < current.distance) {
          return { alias, distance };
        }

        return current;
      },
      null as { alias: string; distance: number } | null
    );

    if (!bestAlias) {
      return { entry, score: 0, distance: Number.POSITIVE_INFINITY };
    }

    const maxLength = Math.max(normalized.length, bestAlias.alias.length);
    return {
      entry,
      score: maxLength > 0 ? 1 - bestAlias.distance / maxLength : 0,
      distance: bestAlias.distance,
    };
  })
    .filter((item) => item.distance <= 2 && item.score >= 0.84)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.distance - right.distance;
    });

  if (scoredMatches.length === 0) {
    return {
      input,
      status: 'none',
      id: null,
      code: null,
      name: null,
      suggestions: [],
    };
  }

  const [bestMatch, secondMatch] = scoredMatches;

  if (scoredMatches.length === 1 && bestMatch) {
    return {
      input,
      status: 'fuzzy',
      id: bestMatch.entry.id,
      code: bestMatch.entry.codigo,
      name: bestMatch.entry.nome,
      suggestions: [`${bestMatch.entry.id} - ${bestMatch.entry.nome}`],
    };
  }

  if (
    bestMatch &&
    bestMatch.score >= 0.9 &&
    (!secondMatch || bestMatch.score - secondMatch.score >= 0.04)
  ) {
    return {
      input,
      status: 'fuzzy',
      id: bestMatch.entry.id,
      code: bestMatch.entry.codigo,
      name: bestMatch.entry.nome,
      suggestions: scoredMatches.slice(0, 3).map((item) => `${item.entry.id} - ${item.entry.nome}`),
    };
  }

  return {
    input,
    status: 'ambiguous',
    id: null,
    code: null,
    name: null,
    suggestions: scoredMatches.slice(0, 3).map((item) => `${item.entry.id} - ${item.entry.nome}`),
  };
}

function normalizeRole(value: string): UserRole | null {
  return ROLE_ALIASES[normalizeText(value)] || null;
}

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function assertImportAvailable(): void {
  if (!shouldUseBackendAdminUsersApi() && isLegacySupabaseAdminFlowDisabled()) {
    throw new Error(
      'Importacao em lote indisponivel: o backend administrativo nao esta ativo e o fluxo legado foi desativado.'
    );
  }
}

function assertLegacyActorRole(actorRole: UserRole | undefined): UserRole {
  if (!actorRole) {
    throw new Error('Nao foi possivel identificar o papel administrativo atual para importar o lote.');
  }

  return actorRole;
}

function assertImportSize(rows: UserImportInputRow[]): void {
  if (rows.length === 0) {
    throw new Error('Cole pelo menos uma linha da planilha para importar.');
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`O limite da importacao em lote e de ${MAX_IMPORT_ROWS} linhas por envio.`);
  }
}

function createTemporaryPassword(): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%*?';
  const all = `${uppercase}${lowercase}${digits}${symbols}`;

  const chars = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  while (chars.length < 14) {
    chars.push(all[Math.floor(Math.random() * all.length)]);
  }

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
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

function buildSummary<T extends { status: UserImportPreviewRow['status'] }>(rows: T[]) {
  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === 'ready').length,
    review: rows.filter((row) => row.status === 'review').length,
    error: rows.filter((row) => row.status === 'error').length,
    duplicate: rows.filter((row) => row.status === 'duplicate').length,
  };
}

async function previewUsersImportLegacy(
  rows: UserImportInputRow[],
  actorRole: UserRole | undefined
): Promise<UserImportPreviewResponse> {
  assertImportSize(rows);
  const normalizedActorRole = assertLegacyActorRole(actorRole);

  const normalizedRows = rows.map((row, index) => ({
    rowNumber: row.rowNumber || index + 1,
    name: (row.name || '').trim(),
    email: (row.email || '').trim().toLowerCase(),
    roleInput: (row.role || '').trim(),
    microregionsInput: (row.microregions || '').trim(),
    municipality: (row.municipality || '').trim(),
  }));

  const existingUsers = await listUsers();
  const existingEmails = new Set(existingUsers.map((user) => user.email.trim().toLowerCase()));
  const seenEmails = new Set<string>();

  const previewRows = normalizedRows.map<UserImportPreviewRow>((row) => {
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
    } else if (!canAssignAdminRole(normalizedActorRole, role)) {
      issues.push(getAdminRoleAssignmentError(role));
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

          if (resolved.id && resolved.name && !normalizedMicroregionIds.includes(resolved.id)) {
            normalizedMicroregionIds.push(resolved.id);
            normalizedMicroregionNames.push(resolved.name);
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

    let status: UserImportPreviewRow['status'] = 'ready';
    const duplicateOnly =
      issues.length > 0 &&
      issues.every(
        (issue) =>
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
    };
  });

  return {
    rows: previewRows,
    summary: buildSummary(previewRows),
  };
}

async function commitUsersImportLegacy(args: {
  rows: UserImportInputRow[];
  loginUrl?: string;
  actorRole?: UserRole;
}): Promise<UserImportCommitResponse> {
  const preview = await previewUsersImportLegacy(args.rows, args.actorRole);
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
        loginUrl: args.loginUrl || null,
      });
      continue;
    }

    try {
      const temporaryPassword = createTemporaryPassword();
      const createdUser = await createUser({
        nome: row.name,
        email: row.email,
        senha: temporaryPassword,
        role: row.role,
        microregiaoId: toMicroregionStorage(row.role, row.normalizedMicroregionIds) || undefined,
      });

      const commitWarnings = [...row.warnings];

      if (row.municipality && row.normalizedMicroregionIds.length === 1) {
        await saveUserMunicipality(
          row.normalizedMicroregionIds[0],
          row.email,
          row.municipality,
          row.name
        );
      } else if (row.municipality && row.normalizedMicroregionIds.length > 1) {
        commitWarnings.push(
          'Municipio nao foi vinculado automaticamente porque a linha possui mais de uma microrregiao.'
        );
      }

      created += 1;
      rows.push({
        ...row,
        warnings: commitWarnings,
        result: 'created',
        userId: createdUser.id,
        temporaryPassword,
        loginUrl: args.loginUrl || null,
      });
    } catch (error) {
      failed += 1;
      rows.push({
        ...row,
        result: 'failed',
        userId: null,
        temporaryPassword: null,
        loginUrl: args.loginUrl || null,
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

export function canUseAdminUserImport(): boolean {
  return shouldUseBackendAdminUsersApi() || !isLegacySupabaseAdminFlowDisabled();
}

export function getAdminUserImportMode(): 'backend' | 'legacy' | 'unavailable' {
  if (shouldUseBackendAdminUsersApi()) {
    return 'backend';
  }

  if (!isLegacySupabaseAdminFlowDisabled()) {
    return 'legacy';
  }

  return 'unavailable';
}

export async function previewUsersImport(
  rows: UserImportInputRow[],
  actorRole?: UserRole
): Promise<UserImportPreviewResponse> {
  assertImportAvailable();

  if (shouldUseBackendAdminUsersApi()) {
    return previewUsersImportViaBackendApi(rows);
  }

  return previewUsersImportLegacy(rows, actorRole);
}

export async function commitUsersImport(args: {
  rows: UserImportInputRow[];
  loginUrl?: string;
  actorRole?: UserRole;
}): Promise<UserImportCommitResponse> {
  assertImportAvailable();

  if (shouldUseBackendAdminUsersApi()) {
    return commitUsersImportViaBackendApi(args);
  }

  return commitUsersImportLegacy(args);
}
