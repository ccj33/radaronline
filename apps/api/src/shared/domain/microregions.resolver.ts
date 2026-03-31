import { MICROREGIONS_CATALOG, type MicroregionCatalogEntry } from './microregions.catalog.js';

export type MicroregionMatchStatus =
  | 'exact-id'
  | 'exact-code'
  | 'exact-name'
  | 'exact-alias'
  | 'fuzzy'
  | 'ambiguous'
  | 'none';

export interface ResolvedMicroregion {
  input: string;
  status: MicroregionMatchStatus;
  id: string | null;
  code: string | null;
  name: string | null;
  suggestions: string[];
}

interface IndexedMicroregion extends MicroregionCatalogEntry {
  normalizedName: string;
  aliases: string[];
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

function normalizeCompact(value: string): string {
  return normalizeText(value).replace(/\s+/g, '');
}

function buildAliases(entry: MicroregionCatalogEntry): string[] {
  const aliases = new Set<string>();
  const normalizedName = normalizeText(entry.name);

  aliases.add(normalizedName);

  for (const segment of entry.name.split('/')) {
    const normalizedSegment = normalizeText(segment);
    if (normalizedSegment) {
      aliases.add(normalizedSegment);
    }
  }

  return Array.from(aliases);
}

const INDEXED_MICROREGIONS: IndexedMicroregion[] = MICROREGIONS_CATALOG.map((entry) => ({
  ...entry,
  normalizedName: normalizeText(entry.name),
  aliases: buildAliases(entry),
}));

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

export function isGlobalMicroregionMarker(value: string): boolean {
  return GLOBAL_MICROREGION_MARKERS.has(normalizeText(value));
}

export function splitMicroregionInput(value: string): string[] {
  return value
    .split(/[|,;]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function resolveMicroregion(input: string): ResolvedMicroregion {
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
      code: byId.code,
      name: byId.name,
      suggestions: [],
    };
  }

  const byCode = INDEXED_MICROREGIONS.find((entry) => normalizeCompact(entry.code) === compact);
  if (byCode) {
    return {
      input,
      status: 'exact-code',
      id: byCode.id,
      code: byCode.code,
      name: byCode.name,
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
      code: match.code,
      name: match.name,
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
      suggestions: exactAliasMatches.map((entry) => `${entry.id} - ${entry.name}`),
    };
  }

  const scoredMatches = INDEXED_MICROREGIONS.map((entry) => {
    const bestDistance = Math.min(
      ...entry.aliases
        .filter((alias) => alias.length >= 3 && normalized.length >= 3)
        .map((alias) => levenshteinDistance(normalized, alias))
    );

    const bestAlias = entry.aliases.reduce(
      (current, alias) => {
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
      code: bestMatch.entry.code,
      name: bestMatch.entry.name,
      suggestions: [`${bestMatch.entry.id} - ${bestMatch.entry.name}`],
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
      code: bestMatch.entry.code,
      name: bestMatch.entry.name,
      suggestions: scoredMatches.slice(0, 3).map((item) => `${item.entry.id} - ${item.entry.name}`),
    };
  }

  return {
    input,
    status: 'ambiguous',
    id: null,
    code: null,
    name: null,
    suggestions: scoredMatches.slice(0, 3).map((item) => `${item.entry.id} - ${item.entry.name}`),
  };
}
