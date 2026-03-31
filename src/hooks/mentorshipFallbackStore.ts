import type {
  Mentor,
  MentorAvailability,
  MentorshipBadge,
  MentorshipGoal,
  MentorshipMatch,
  MentorshipSession,
  MentorshipSpecialty,
} from '../types/mentorship.types';
import {
  generateHubId,
  nowIso,
  readHubStore,
  subscribeToHubStore,
  writeHubStore,
} from './hubFallbackUtils';

const STORAGE_KEY = 'hub:mentorship:fallback-store';
const UPDATE_EVENT = 'hub:mentorship:fallback-updated';

interface MentorshipFallbackStore {
  version: 1;
  mentors: Mentor[];
  matches: MentorshipMatch[];
  sessions: MentorshipSession[];
  goals: MentorshipGoal[];
  badges: MentorshipBadge[];
}

function createAvailability(mentorId: string, dayOfWeek: number, startTime: string, endTime: string): MentorAvailability {
  return {
    id: generateHubId('availability'),
    mentorId,
    dayOfWeek,
    startTime,
    endTime,
    isActive: true,
  };
}

function createMentor(input: {
  id: string;
  userId: string;
  fullName: string;
  jobTitle: string;
  municipality: string;
  organization: string;
  bio: string;
  specialties: MentorshipSpecialty[];
  yearsExperience: number;
  avgRating: number;
  ratingCount: number;
  currentMentees: number;
  maxMentees: number;
}): Mentor {
  const now = nowIso();

  return {
    id: input.id,
    userId: input.userId,
    bio: input.bio,
    yearsExperience: input.yearsExperience,
    municipality: input.municipality,
    organization: input.organization,
    specialties: input.specialties,
    maxMentees: input.maxMentees,
    currentMentees: input.currentMentees,
    isActive: true,
    isVerified: true,
    totalSessions: Math.max(input.currentMentees * 3, 6),
    totalHours: Math.max(input.currentMentees * 5, 12),
    avgRating: input.avgRating,
    ratingCount: input.ratingCount,
    linkedinUrl: null,
    availabilityNotes: 'Agenda aberta para encontros curtos e mentorias praticas.',
    createdAt: now,
    updatedAt: now,
    profile: {
      id: input.userId,
      fullName: input.fullName,
      avatarUrl: null,
      jobTitle: input.jobTitle,
    },
    availability: [
      createAvailability(input.id, 2, '14:00', '17:00'),
      createAvailability(input.id, 4, '09:00', '12:00'),
    ],
  };
}

function createInitialStore(): MentorshipFallbackStore {
  const mentors = [
    createMentor({
      id: 'mentor-rnds',
      userId: 'mentor-user-rnds',
      fullName: 'Ana Paula Freitas',
      jobTitle: 'Coordenadora de Transformacao Digital',
      municipality: 'Belo Horizonte',
      organization: 'Secretaria Municipal de Saude',
      bio: 'Atua com implantacao de fluxos digitais e desenho de operacao assistida na rede.',
      specialties: ['rnds', 'implementacao', 'seguranca_lgpd'],
      yearsExperience: 9,
      avgRating: 4.9,
      ratingCount: 26,
      currentMentees: 2,
      maxMentees: 5,
    }),
    createMentor({
      id: 'mentor-esus',
      userId: 'mentor-user-esus',
      fullName: 'Carlos Henrique Souza',
      jobTitle: 'Referência Regional e-SUS',
      municipality: 'Montes Claros',
      organization: 'Microrregiao Norte',
      bio: 'Foco em rotina de implantacao, acompanhamento de equipes e traducao de gargalos em passos executaveis.',
      specialties: ['esus_ab', 'esus_regulacao', 'implementacao'],
      yearsExperience: 12,
      avgRating: 4.8,
      ratingCount: 31,
      currentMentees: 3,
      maxMentees: 6,
    }),
    createMentor({
      id: 'mentor-tele',
      userId: 'mentor-user-tele',
      fullName: 'Marina Teixeira',
      jobTitle: 'Especialista em Telessaude',
      municipality: 'Uberaba',
      organization: 'Rede Regional de Saude Digital',
      bio: 'Apoia equipes na operacionalizacao de teleatendimento, protocolos e articulacao com a gestao.',
      specialties: ['telessaude', 'seguranca_lgpd', 'outros'],
      yearsExperience: 7,
      avgRating: 4.7,
      ratingCount: 18,
      currentMentees: 1,
      maxMentees: 4,
    }),
  ];

  return {
    version: 1,
    mentors,
    matches: [],
    sessions: [],
    goals: [],
    badges: [],
  };
}

function isValidStore(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const parsed = value as Partial<MentorshipFallbackStore>;
  return (
    Array.isArray(parsed.mentors) &&
    Array.isArray(parsed.matches) &&
    Array.isArray(parsed.sessions) &&
    Array.isArray(parsed.goals) &&
    Array.isArray(parsed.badges)
  );
}

function cloneStore(store: MentorshipFallbackStore): MentorshipFallbackStore {
  return {
    version: 1,
    mentors: store.mentors.map((mentor) => ({
      ...mentor,
      profile: mentor.profile ? { ...mentor.profile } : undefined,
      availability: mentor.availability?.map((slot) => ({ ...slot })),
    })),
    matches: store.matches.map((match) => ({ ...match })),
    sessions: store.sessions.map((session) => ({ ...session })),
    goals: store.goals.map((goal) => ({ ...goal })),
    badges: store.badges.map((badge) => ({ ...badge })),
  };
}

export function readMentorshipFallbackStore(): MentorshipFallbackStore {
  return readHubStore(STORAGE_KEY, createInitialStore, isValidStore);
}

export function subscribeToMentorshipFallbackUpdates(callback: () => void): () => void {
  return subscribeToHubStore(STORAGE_KEY, UPDATE_EVENT, callback);
}

function writeMentorshipFallbackStore(store: MentorshipFallbackStore, options?: { notify?: boolean }) {
  writeHubStore(STORAGE_KEY, UPDATE_EVENT, cloneStore(store), options);
}

export function getFallbackMentors(filters?: {
  specialty?: MentorshipSpecialty;
  municipality?: string;
  verifiedOnly?: boolean;
}): Mentor[] {
  let mentors = readMentorshipFallbackStore().mentors.filter((mentor) => mentor.isActive);

  if (filters?.verifiedOnly) {
    mentors = mentors.filter((mentor) => mentor.isVerified);
  }

  if (filters?.municipality) {
    mentors = mentors.filter((mentor) => mentor.municipality === filters.municipality);
  }

  if (filters?.specialty) {
    mentors = mentors.filter((mentor) => mentor.specialties.includes(filters.specialty!));
  }

  return mentors.sort((left, right) => right.avgRating - left.avgRating);
}

export function getFallbackMentorProfile(userId: string): Mentor | null {
  return readMentorshipFallbackStore().mentors.find((mentor) => mentor.userId === userId) || null;
}

export function getFallbackMentorshipMatches(userId: string): MentorshipMatch[] {
  return readMentorshipFallbackStore().matches
    .filter((match) => match.mentorId === userId || match.menteeId === userId)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function getFallbackMentorshipSessions(matchId: string): MentorshipSession[] {
  return readMentorshipFallbackStore().sessions
    .filter((session) => session.matchId === matchId)
    .sort((left, right) => left.sessionNumber - right.sessionNumber);
}

export function getFallbackMentorshipGoals(matchId: string): MentorshipGoal[] {
  return readMentorshipFallbackStore().goals
    .filter((goal) => goal.matchId === matchId)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}

export function getFallbackMentorshipBadges(userId: string): MentorshipBadge[] {
  return readMentorshipFallbackStore().badges
    .filter((badge) => badge.userId === userId)
    .sort((left, right) => new Date(right.earnedAt).getTime() - new Date(left.earnedAt).getTime());
}

export function requestFallbackMentorship(input: {
  mentorId: string;
  menteeId: string;
  specialties: MentorshipSpecialty[];
  goals: string;
}): boolean {
  const store = readMentorshipFallbackStore();
  const mentor = store.mentors.find((entry) => entry.userId === input.mentorId || entry.id === input.mentorId);

  if (!mentor) {
    return false;
  }

  const now = nowIso();

  store.matches.unshift({
    id: generateHubId('match'),
    mentorId: mentor.userId,
    menteeId: input.menteeId,
    status: 'pending',
    matchScore: null,
    matchedSpecialties: input.specialties,
    startDate: null,
    endDate: null,
    goals: input.goals || null,
    currentPhase: 'diagnostic',
    phaseProgress: 0,
    createdAt: now,
  });

  mentor.updatedAt = now;
  writeMentorshipFallbackStore(store);
  return true;
}
