import type { Course, CourseCategory, CourseFormat, CourseLevel, Trail } from '../types/education.types';
import {
  generateHubId,
  nowIso,
  readHubStore,
  subscribeToHubStore,
  writeHubStore,
} from './hubFallbackUtils';

const STORAGE_KEY = 'hub:education:fallback-store';
const UPDATE_EVENT = 'hub:education:fallback-updated';

interface EducationFallbackStore {
  version: 1;
  courses: Course[];
  trails: Trail[];
}

function createCourse(input: {
  title: string;
  description: string;
  duration: string;
  category: CourseCategory;
  level: CourseLevel;
  format: CourseFormat;
  progress?: number;
  enrolled?: number;
  url?: string | null;
}): Course {
  return {
    id: generateHubId('course'),
    title: input.title,
    description: input.description,
    duration: input.duration,
    enrolled: input.enrolled || 0,
    category: input.category,
    level: input.level,
    format: input.format,
    url: input.url || null,
    progress: input.progress || 0,
    createdAt: nowIso(),
  };
}

function createTrail(input: {
  title: string;
  description: string;
  coursesCount: number;
  totalHours: number;
  enrolled?: number;
  progress?: number;
}): Trail {
  return {
    id: generateHubId('trail'),
    title: input.title,
    description: input.description,
    coursesCount: input.coursesCount,
    totalHours: input.totalHours,
    enrolled: input.enrolled || 0,
    progress: input.progress || 0,
    createdAt: nowIso(),
  };
}

function createInitialStore(): EducationFallbackStore {
  return {
    version: 1,
    courses: [
      createCourse({
        title: 'Fundamentos do e-SUS para equipes locais',
        description: 'Visao pratica do fluxo minimo de implantacao e acompanhamento municipal.',
        duration: '2h',
        category: 'e-SUS',
        level: 'basico',
        format: 'online',
        progress: 35,
        enrolled: 18,
      }),
      createCourse({
        title: 'RNDS sem atrito: do conceito ao uso',
        description: 'Resumo claro sobre interoperabilidade, envio de dados e pontos de atencao.',
        duration: '1h30',
        category: 'RNDS',
        level: 'intermediario',
        format: 'online',
        progress: 0,
        enrolled: 11,
      }),
      createCourse({
        title: 'Seguranca e LGPD no cotidiano da saude digital',
        description: 'Boas praticas objetivas para reduzir risco operacional e de dados.',
        duration: '2h15',
        category: 'Segurança',
        level: 'intermediario',
        format: 'hibrido',
        progress: 100,
        enrolled: 26,
      }),
      createCourse({
        title: 'Gestao da implantacao com leitura de gargalos',
        description: 'Como transformar acompanhamento em rotina de ajuste e execucao.',
        duration: '1h45',
        category: 'Gestão',
        level: 'avancado',
        format: 'presencial',
        progress: 0,
        enrolled: 9,
      }),
    ],
    trails: [
      createTrail({
        title: 'Primeiros passos em Saude Digital',
        description: 'Trilha curta para organizar repertorio, rotina e linguagem comum da equipe.',
        coursesCount: 3,
        totalHours: 6,
        enrolled: 20,
        progress: 35,
      }),
      createTrail({
        title: 'Governanca e seguranca para operacao local',
        description: 'Percurso para times que precisam amadurecer controle, fluxo e conformidade.',
        coursesCount: 4,
        totalHours: 8,
        enrolled: 12,
        progress: 0,
      }),
    ],
  };
}

function isValidStore(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const parsed = value as Partial<EducationFallbackStore>;
  return Array.isArray(parsed.courses) && Array.isArray(parsed.trails);
}

function cloneStore(store: EducationFallbackStore): EducationFallbackStore {
  return {
    version: 1,
    courses: store.courses.map((course) => ({ ...course })),
    trails: store.trails.map((trail) => ({ ...trail })),
  };
}

export function readEducationFallbackStore(): EducationFallbackStore {
  return readHubStore(STORAGE_KEY, createInitialStore, isValidStore);
}

export function subscribeToEducationFallbackUpdates(callback: () => void): () => void {
  return subscribeToHubStore(STORAGE_KEY, UPDATE_EVENT, callback);
}

function writeEducationFallbackStore(store: EducationFallbackStore, options?: { notify?: boolean }) {
  writeHubStore(STORAGE_KEY, UPDATE_EVENT, cloneStore(store), options);
}

export function getFallbackCourses(): Course[] {
  return readEducationFallbackStore().courses
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function getFallbackTrails(): Trail[] {
  return readEducationFallbackStore().trails
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function addFallbackCourse(input: {
  title: string;
  description: string;
  duration: string;
  category: CourseCategory;
  level: CourseLevel;
  format: CourseFormat;
  url?: string;
}): boolean {
  const store = readEducationFallbackStore();

  store.courses.unshift(
    createCourse({
      ...input,
      url: input.url || null,
      progress: 0,
      enrolled: 0,
    }),
  );

  writeEducationFallbackStore(store);
  return true;
}

export function addFallbackTrail(input: {
  title: string;
  description: string;
  coursesCount: number;
  totalHours: number;
}): boolean {
  const store = readEducationFallbackStore();

  store.trails.unshift(
    createTrail({
      ...input,
      enrolled: 0,
      progress: 0,
    }),
  );

  writeEducationFallbackStore(store);
  return true;
}

export function enrollFallbackCourse(courseId: string): boolean {
  const store = readEducationFallbackStore();
  const course = store.courses.find((entry) => entry.id === courseId);

  if (!course) {
    return false;
  }

  course.enrolled += 1;
  course.progress = course.progress > 0 ? Math.min(course.progress + 15, 100) : 15;
  writeEducationFallbackStore(store);
  return true;
}
