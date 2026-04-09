import type { TeamMember } from '../../types';
import type {
  PendingRegistration,
  PendingRegistrationRow,
  TeamDTO,
  TeamProfileRow,
  TeamsByMicro,
} from './teamsService.types';

export function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

export function mapTeamDTOToTeamMember(dto: TeamDTO): TeamMember {
  return {
    id: dto.id,
    microregiaoId: dto.microregiao_id,
    name: dto.name,
    role: dto.cargo,
    email: dto.email || '',
    municipio: dto.municipio || 'Sede/Remoto',
    isRegistered: !!dto.profile_id,
  };
}

function mapProfileRowToTeamMember(
  profile: TeamProfileRow,
  teamRecordByEmail: Map<string, TeamDTO>
): TeamMember {
  const normalizedEmail = normalizeEmail(profile.email);
  const teamRecord = normalizedEmail ? teamRecordByEmail.get(normalizedEmail) : undefined;
  const microId = profile.microregiao_id || 'unassigned';

  return {
    id: profile.id,
    name: profile.nome,
    role: profile.role || 'Membro',
    email: profile.email || '',
    municipio: teamRecord?.municipio || profile.municipio || 'Sede/Remoto',
    microregiaoId: microId,
    isRegistered: true,
  };
}

export function mergeProfilesAndTeams(
  profilesData: TeamProfileRow[],
  teamsData: TeamDTO[]
): TeamsByMicro {
  const teamsByMicro: TeamsByMicro = {};
  const teamRecordByEmail = new Map<string, TeamDTO>();
  const registeredEmailsByMicro = new Map<string, Set<string>>();
  const registeredProfileEmails = new Set<string>();

  teamsData.forEach((teamRecord) => {
    const normalizedEmail = normalizeEmail(teamRecord.email);
    if (normalizedEmail && !teamRecordByEmail.has(normalizedEmail)) {
      teamRecordByEmail.set(normalizedEmail, teamRecord);
    }
  });

  profilesData.forEach((profile) => {
    const teamMember = mapProfileRowToTeamMember(profile, teamRecordByEmail);
    const microId = teamMember.microregiaoId;
    const normalizedEmail = normalizeEmail(teamMember.email);

    if (!teamsByMicro[microId]) {
      teamsByMicro[microId] = [];
    }

    teamsByMicro[microId].push(teamMember);

    if (normalizedEmail) {
      registeredProfileEmails.add(normalizedEmail);
      if (!registeredEmailsByMicro.has(microId)) {
        registeredEmailsByMicro.set(microId, new Set());
      }
      registeredEmailsByMicro.get(microId)?.add(normalizedEmail);
    }
  });

  teamsData.forEach((teamRecord) => {
    const microId = teamRecord.microregiao_id;
    const normalizedEmail = normalizeEmail(teamRecord.email);
    const alreadyExists =
      !!normalizedEmail && registeredEmailsByMicro.get(microId)?.has(normalizedEmail);

    if (alreadyExists) {
      return;
    }

    const member = mapTeamDTOToTeamMember(teamRecord);
    member.isRegistered =
      !!teamRecord.profile_id ||
      (!!normalizedEmail && registeredProfileEmails.has(normalizedEmail));

    if (!teamsByMicro[microId]) {
      teamsByMicro[microId] = [];
    }

    teamsByMicro[microId].push(member);
  });

  return teamsByMicro;
}

export function mapPendingRegistration(
  row: PendingRegistrationRow
): PendingRegistration {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    municipio: row.municipio,
    microregiaoId: row.microregiao_id,
    cargo: row.cargo || 'Membro',
    createdAt: row.created_at,
  };
}
