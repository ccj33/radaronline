import type {
  CreateTeamMemberInput,
  PendingRegistrationRecord,
  SaveUserMunicipalityInput,
  TeamMemberRecord,
} from './teams.types.js';

export interface TeamsRepository {
  listTeams(microregionId?: string): Promise<Record<string, TeamMemberRecord[]>>;
  getUserTeamStatus(
    email: string,
    microregionId?: string
  ): Promise<{ exists: boolean; municipality: string | null }>;
  getTeamMemberById(memberId: string): Promise<TeamMemberRecord | null>;
  getPendingRegistrationById(id: string): Promise<PendingRegistrationRecord | null>;
  saveUserMunicipality(input: SaveUserMunicipalityInput): Promise<void>;
  addTeamMember(input: CreateTeamMemberInput): Promise<TeamMemberRecord>;
  removeTeamMember(memberId: string): Promise<void>;
  listPendingRegistrations(): Promise<PendingRegistrationRecord[]>;
  deletePendingRegistration(id: string): Promise<void>;
}

const inMemoryTeams = new Map<string, TeamMemberRecord[]>([
  [
    'MR001',
    [
      {
        id: 'team-seed-1',
        microregionId: 'MR001',
        name: 'Administrador Seed',
        role: 'Administrador',
        email: 'admin@example.gov.br',
        municipality: 'Belo Horizonte',
        isRegistered: true,
      },
    ],
  ],
]);

const inMemoryPending = new Map<string, PendingRegistrationRecord>();

function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

export class InMemoryTeamsRepository implements TeamsRepository {
  async listTeams(microregionId?: string): Promise<Record<string, TeamMemberRecord[]>> {
    if (microregionId && microregionId !== 'all') {
      return {
        [microregionId]: [...(inMemoryTeams.get(microregionId) || [])],
      };
    }

    return Object.fromEntries(
      [...inMemoryTeams.entries()].map(([key, value]) => [key, [...value]])
    );
  }

  async getUserTeamStatus(
    email: string,
    microregionId?: string
  ): Promise<{ exists: boolean; municipality: string | null }> {
    const normalized = normalizeEmail(email);
    const microIds =
      microregionId && microregionId !== 'all' ? [microregionId] : [...inMemoryTeams.keys()];

    for (const microId of microIds) {
      const members = inMemoryTeams.get(microId) || [];
      const found = members.find((member) => normalizeEmail(member.email) === normalized);
      if (found) {
        return { exists: true, municipality: found.municipality || null };
      }
    }

    return { exists: false, municipality: null };
  }

  async getTeamMemberById(memberId: string): Promise<TeamMemberRecord | null> {
    for (const members of inMemoryTeams.values()) {
      const found = members.find((member) => member.id === memberId);
      if (found) {
        return { ...found };
      }
    }

    return null;
  }

  async getPendingRegistrationById(id: string): Promise<PendingRegistrationRecord | null> {
    return inMemoryPending.get(id) || null;
  }

  async saveUserMunicipality(input: SaveUserMunicipalityInput): Promise<void> {
    const normalized = normalizeEmail(input.email);
    const members = inMemoryTeams.get(input.microregionId) || [];
    const existing = members.find((member) => normalizeEmail(member.email) === normalized);

    if (existing) {
      existing.municipality = input.municipality;
      existing.name = input.userName;
      return;
    }

    members.push({
      id: crypto.randomUUID(),
      microregionId: input.microregionId,
      name: input.userName,
      role: 'Membro',
      email: normalized,
      municipality: input.municipality,
      isRegistered: true,
    });
    inMemoryTeams.set(input.microregionId, members);
  }

  async addTeamMember(input: CreateTeamMemberInput): Promise<TeamMemberRecord> {
    const item: TeamMemberRecord = {
      id: crypto.randomUUID(),
      microregionId: input.microregionId,
      name: input.name,
      role: input.role,
      email: normalizeEmail(input.email),
      municipality: input.municipality?.trim() || 'Sede/Remoto',
      isRegistered: false,
    };

    const members = inMemoryTeams.get(input.microregionId) || [];
    members.push(item);
    inMemoryTeams.set(input.microregionId, members);

    if (!item.isRegistered) {
      inMemoryPending.set(item.id, {
        id: item.id,
        name: item.name,
        email: item.email,
        municipality: item.municipality,
        microregionId: item.microregionId,
        role: item.role,
        createdAt: new Date().toISOString(),
      });
    }

    return item;
  }

  async removeTeamMember(memberId: string): Promise<void> {
    for (const [microId, members] of inMemoryTeams.entries()) {
      const nextMembers = members.filter((member) => member.id !== memberId);
      if (nextMembers.length !== members.length) {
        inMemoryTeams.set(microId, nextMembers);
        inMemoryPending.delete(memberId);
        return;
      }
    }
  }

  async listPendingRegistrations(): Promise<PendingRegistrationRecord[]> {
    return [...inMemoryPending.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }

  async deletePendingRegistration(id: string): Promise<void> {
    inMemoryPending.delete(id);
    await this.removeTeamMember(id);
  }
}
