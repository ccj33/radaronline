import type { Material, MaterialCategory, MaterialType } from '../types/repository.types';
import {
  generateHubId,
  nowIso,
  readHubStore,
  subscribeToHubStore,
  writeHubStore,
} from './hubFallbackUtils';

const STORAGE_KEY = 'hub:repository:fallback-store';
const UPDATE_EVENT = 'hub:repository:fallback-updated';

interface RepositoryFallbackStore {
  version: 1;
  materials: Material[];
}

function createMaterial(input: {
  title: string;
  description: string;
  type: MaterialType;
  category: MaterialCategory;
  author: string;
  fileUrl?: string | null;
}): Material {
  const now = nowIso();

  return {
    id: generateHubId('material'),
    title: input.title,
    description: input.description,
    type: input.type,
    category: input.category,
    author: input.author,
    fileUrl: input.fileUrl || null,
    fileSize: null,
    downloads: 0,
    views: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function createInitialStore(): RepositoryFallbackStore {
  return {
    version: 1,
    materials: [
      createMaterial({
        title: 'Guia rapido de implantacao do e-SUS',
        description: 'Resumo enxuto para alinhar equipe, rotina inicial e pontos de atencao.',
        type: 'manual',
        category: 'e-SUS',
        author: 'Equipe Radar',
      }),
      createMaterial({
        title: 'Checklist de seguranca e LGPD para operacao local',
        description: 'Lista objetiva para revisao de acesso, compartilhamento e tratamento de dados.',
        type: 'template',
        category: 'Legislação',
        author: 'Governanca de Dados',
      }),
      createMaterial({
        title: 'Video curto: leitura de gargalos da jornada',
        description: 'Material introdutorio para apoiar reunioes de acompanhamento.',
        type: 'video',
        category: 'Gestão',
        author: 'Laboratorio de Implantacao',
      }),
      createMaterial({
        title: 'FAQ de RNDS para equipes gestoras',
        description: 'Perguntas recorrentes respondidas em linguagem simples.',
        type: 'faq',
        category: 'RNDS',
        author: 'Rede de Apoio',
      }),
    ],
  };
}

function isValidStore(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const parsed = value as Partial<RepositoryFallbackStore>;
  return Array.isArray(parsed.materials);
}

function cloneStore(store: RepositoryFallbackStore): RepositoryFallbackStore {
  return {
    version: 1,
    materials: store.materials.map((material) => ({ ...material })),
  };
}

export function readRepositoryFallbackStore(): RepositoryFallbackStore {
  return readHubStore(STORAGE_KEY, createInitialStore, isValidStore);
}

export function subscribeToRepositoryFallbackUpdates(callback: () => void): () => void {
  return subscribeToHubStore(STORAGE_KEY, UPDATE_EVENT, callback);
}

function writeRepositoryFallbackStore(store: RepositoryFallbackStore, options?: { notify?: boolean }) {
  writeHubStore(STORAGE_KEY, UPDATE_EVENT, cloneStore(store), options);
}

export function getFallbackMaterials(): Material[] {
  return readRepositoryFallbackStore().materials
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function addFallbackMaterial(input: {
  title: string;
  description: string;
  type: MaterialType;
  category: MaterialCategory;
  author: string;
  url?: string;
}): boolean {
  const store = readRepositoryFallbackStore();

  store.materials.unshift(
    createMaterial({
      title: input.title,
      description: input.description,
      type: input.type,
      category: input.category,
      author: input.author,
      fileUrl: input.url || null,
    }),
  );

  writeRepositoryFallbackStore(store);
  return true;
}
