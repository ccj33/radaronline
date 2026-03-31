import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Mentor,
  MentorshipMatch,
  MentorshipSession,
  MentorshipGoal,
  MentorshipBadge,
  MentorProfile,
  MentorshipSpecialty,
  MentorAvailability,
} from '../types/mentorship.types';
import {
  getFallbackMentorProfile,
  getFallbackMentorshipBadges,
  getFallbackMentorshipGoals,
  getFallbackMentorshipMatches,
  getFallbackMentorshipSessions,
  getFallbackMentors,
  requestFallbackMentorship,
  subscribeToMentorshipFallbackUpdates,
} from './mentorshipFallbackStore';
import { isHubBackendUnavailable, normalizeHubError } from './hubFallbackUtils';

function mapProfile(row: Record<string, unknown>): MentorProfile {
  return {
    id: row.id as string,
    fullName: (row.full_name as string | null) ?? (row.nome as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    jobTitle: (row.job_title as string | null) ?? null,
  };
}

function mapMentor(
  row: Record<string, unknown>,
  profile?: MentorProfile,
  availability?: MentorAvailability[],
): Mentor {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    bio: row.bio as string | null,
    yearsExperience: row.years_experience as number,
    municipality: row.municipality as string | null,
    organization: row.organization as string | null,
    specialties: (row.specialties || []) as MentorshipSpecialty[],
    maxMentees: row.max_mentees as number,
    currentMentees: row.current_mentees as number,
    isActive: row.is_active as boolean,
    isVerified: row.is_verified as boolean,
    totalSessions: row.total_sessions as number,
    totalHours: row.total_hours as number,
    avgRating: row.avg_rating as number,
    ratingCount: row.rating_count as number,
    linkedinUrl: row.linkedin_url as string | null,
    availabilityNotes: row.availability_notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    profile,
    availability,
  };
}

function mapMatch(row: Record<string, unknown>): MentorshipMatch {
  return {
    id: row.id as string,
    mentorId: row.mentor_id as string,
    menteeId: row.mentee_id as string,
    status: row.status as MentorshipMatch['status'],
    matchScore: row.match_score as number | null,
    matchedSpecialties: (row.matched_specialties || []) as MentorshipSpecialty[],
    startDate: row.start_date as string | null,
    endDate: row.end_date as string | null,
    goals: row.goals as string | null,
    currentPhase: row.current_phase as MentorshipMatch['currentPhase'],
    phaseProgress: row.phase_progress as number,
    createdAt: row.created_at as string,
  };
}

function mapSession(row: Record<string, unknown>): MentorshipSession {
  return {
    id: row.id as string,
    matchId: row.match_id as string,
    sessionType: row.session_type as MentorshipSession['sessionType'],
    sessionNumber: row.session_number as number,
    scheduledAt: row.scheduled_at as string,
    durationMinutes: row.duration_minutes as number,
    status: row.status as MentorshipSession['status'],
    meetingLink: row.meeting_link as string | null,
    agenda: row.agenda as string | null,
    notes: row.notes as string | null,
    rating: row.rating as number | null,
    skillsPracticed: (row.skills_practiced || []) as MentorshipSpecialty[],
    actionItems: (row.action_items || []) as string[],
    completedAt: row.completed_at as string | null,
    createdAt: row.created_at as string,
  };
}

function mapGoal(row: Record<string, unknown>): MentorshipGoal {
  return {
    id: row.id as string,
    matchId: row.match_id as string,
    title: row.title as string,
    description: row.description as string | null,
    specialty: row.specialty as MentorshipSpecialty | null,
    targetDate: row.target_date as string | null,
    status: row.status as MentorshipGoal['status'],
    progressPercentage: row.progress_percentage as number,
    completedAt: row.completed_at as string | null,
    createdAt: row.created_at as string,
  };
}

function mapBadge(row: Record<string, unknown>): MentorshipBadge {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    badgeType: row.badge_type as string,
    badgeName: row.badge_name as string,
    badgeDescription: row.badge_description as string | null,
    badgeIcon: row.badge_icon as string | null,
    earnedAt: row.earned_at as string,
    specialty: row.specialty as MentorshipSpecialty | null,
  };
}

export function useMentors(filters?: {
  specialty?: MentorshipSpecialty;
  municipality?: string;
  verifiedOnly?: boolean;
}) {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const loadFallbackData = useCallback(() => {
    setMentors(getFallbackMentors(filters));
    setError(null);
    setIsFallback(true);
  }, [filters]);

  const fetchMentors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('mentors').select('*').eq('is_active', true);

      if (filters?.verifiedOnly) {
        query = query.eq('is_verified', true);
      }

      if (filters?.municipality) {
        query = query.eq('municipality', filters.municipality);
      }

      const { data, error: dbError } = await query.order('avg_rating', { ascending: false });

      if (dbError) {
        throw dbError;
      }

      if (!data?.length) {
        setMentors([]);
        setIsFallback(false);
        return;
      }

      const userIds = data.map((mentor: Record<string, unknown>) => mentor.user_id as string);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome, full_name, avatar_url, job_title')
        .in('id', userIds);

      if (profilesError) {
        throw profilesError;
      }

      const profileMap = new Map(
        (profiles || []).map((profile: Record<string, unknown>) => [profile.id as string, mapProfile(profile)]),
      );

      let mapped = data.map((mentor: Record<string, unknown>) =>
        mapMentor(mentor, profileMap.get(mentor.user_id as string)),
      );

      if (filters?.specialty) {
        mapped = mapped.filter((mentor) => mentor.specialties.includes(filters.specialty!));
      }

      setMentors(mapped);
      setIsFallback(false);
    } catch (err: unknown) {
      if (isHubBackendUnavailable(err)) {
        loadFallbackData();
      } else {
        setMentors([]);
        setIsFallback(false);
        setError(normalizeHubError(err, 'O modulo de mentorias esta em modo local.'));
      }
    } finally {
      setLoading(false);
    }
  }, [filters, loadFallbackData]);

  useEffect(() => {
    void fetchMentors();
  }, [fetchMentors]);

  useEffect(() => {
    return subscribeToMentorshipFallbackUpdates(() => {
      if (isFallback) {
        loadFallbackData();
      }
    });
  }, [isFallback, loadFallbackData]);

  return { mentors, loading, error, isFallback, refetch: fetchMentors };
}

export function useMentorProfile(userId: string | undefined) {
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  const loadFallbackData = useCallback(() => {
    if (!userId) {
      setMentor(null);
      setIsFallback(false);
      return;
    }

    setMentor(getFallbackMentorProfile(userId));
    setIsFallback(true);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setMentor(null);
      setLoading(false);
      return;
    }

    const fetchMentorProfile = async () => {
      try {
        setLoading(true);

        const { data, error: mentorError } = await supabase
          .from('mentors')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (mentorError) {
          throw mentorError;
        }

        if (!data) {
          setMentor(null);
          setIsFallback(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, nome, full_name, avatar_url, job_title')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        setMentor(mapMentor(data, profile ? mapProfile(profile) : undefined));
        setIsFallback(false);
      } catch (err: unknown) {
        if (isHubBackendUnavailable(err)) {
          loadFallbackData();
        } else {
          setMentor(null);
          setIsFallback(false);
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchMentorProfile();
    return subscribeToMentorshipFallbackUpdates(() => {
      if (isFallback) {
        loadFallbackData();
      }
    });
  }, [isFallback, loadFallbackData, userId]);

  return { mentor, loading, isFallback };
}

export function useMentorshipMatches(userId: string | undefined) {
  const [matches, setMatches] = useState<MentorshipMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  const loadFallbackData = useCallback(() => {
    if (!userId) {
      setMatches([]);
      setIsFallback(false);
      return;
    }

    setMatches(getFallbackMentorshipMatches(userId));
    setIsFallback(true);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const fetchMatches = async () => {
      try {
        setLoading(true);

        const { data, error: dbError } = await supabase
          .from('mentorship_matches')
          .select('*')
          .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`)
          .order('created_at', { ascending: false });

        if (dbError) {
          throw dbError;
        }

        setMatches((data || []).map(mapMatch));
        setIsFallback(false);
      } catch (err: unknown) {
        if (isHubBackendUnavailable(err)) {
          loadFallbackData();
        } else {
          setMatches([]);
          setIsFallback(false);
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchMatches();
    return subscribeToMentorshipFallbackUpdates(() => {
      if (isFallback) {
        loadFallbackData();
      }
    });
  }, [isFallback, loadFallbackData, userId]);

  return { matches, loading, isFallback };
}

export function useMentorshipSessions(matchId: string | undefined) {
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  const loadFallbackData = useCallback(() => {
    if (!matchId) {
      setSessions([]);
      setIsFallback(false);
      return;
    }

    setSessions(getFallbackMentorshipSessions(matchId));
    setIsFallback(true);
  }, [matchId]);

  useEffect(() => {
    if (!matchId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const fetchSessions = async () => {
      try {
        setLoading(true);

        const { data, error: dbError } = await supabase
          .from('mentorship_sessions')
          .select('*')
          .eq('match_id', matchId)
          .order('session_number');

        if (dbError) {
          throw dbError;
        }

        setSessions((data || []).map(mapSession));
        setIsFallback(false);
      } catch (err: unknown) {
        if (isHubBackendUnavailable(err)) {
          loadFallbackData();
        } else {
          setSessions([]);
          setIsFallback(false);
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchSessions();
    return subscribeToMentorshipFallbackUpdates(() => {
      if (isFallback) {
        loadFallbackData();
      }
    });
  }, [isFallback, loadFallbackData, matchId]);

  return { sessions, loading, isFallback };
}

export function useMentorshipGoals(matchId: string | undefined) {
  const [goals, setGoals] = useState<MentorshipGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  const loadFallbackData = useCallback(() => {
    if (!matchId) {
      setGoals([]);
      setIsFallback(false);
      return;
    }

    setGoals(getFallbackMentorshipGoals(matchId));
    setIsFallback(true);
  }, [matchId]);

  useEffect(() => {
    if (!matchId) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const fetchGoals = async () => {
      try {
        setLoading(true);

        const { data, error: dbError } = await supabase
          .from('mentorship_goals')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at');

        if (dbError) {
          throw dbError;
        }

        setGoals((data || []).map(mapGoal));
        setIsFallback(false);
      } catch (err: unknown) {
        if (isHubBackendUnavailable(err)) {
          loadFallbackData();
        } else {
          setGoals([]);
          setIsFallback(false);
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchGoals();
    return subscribeToMentorshipFallbackUpdates(() => {
      if (isFallback) {
        loadFallbackData();
      }
    });
  }, [isFallback, loadFallbackData, matchId]);

  return { goals, loading, isFallback };
}

export function useMentorshipBadges(userId: string | undefined) {
  const [badges, setBadges] = useState<MentorshipBadge[]>([]);
  const [isFallback, setIsFallback] = useState(false);

  const loadFallbackData = useCallback(() => {
    if (!userId) {
      setBadges([]);
      setIsFallback(false);
      return;
    }

    setBadges(getFallbackMentorshipBadges(userId));
    setIsFallback(true);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setBadges([]);
      return;
    }

    const fetchBadges = async () => {
      try {
        const { data, error: dbError } = await supabase
          .from('mentorship_badges')
          .select('*')
          .eq('user_id', userId)
          .order('earned_at', { ascending: false });

        if (dbError) {
          throw dbError;
        }

        setBadges((data || []).map(mapBadge));
        setIsFallback(false);
      } catch (err: unknown) {
        if (isHubBackendUnavailable(err)) {
          loadFallbackData();
        } else {
          setBadges([]);
          setIsFallback(false);
        }
      }
    };

    void fetchBadges();
    return subscribeToMentorshipFallbackUpdates(() => {
      if (isFallback) {
        loadFallbackData();
      }
    });
  }, [isFallback, loadFallbackData, userId]);

  return { badges, isFallback };
}

export function useRequestMentorship() {
  const [requesting, setRequesting] = useState(false);

  const requestMentorship = useCallback(
    async (
      mentorId: string,
      menteeId: string,
      specialties: MentorshipSpecialty[],
      goals: string,
    ) => {
      try {
        setRequesting(true);

        const { error: dbError } = await supabase
          .from('mentorship_matches')
          .insert({
            mentor_id: mentorId,
            mentee_id: menteeId,
            status: 'pending',
            matched_specialties: specialties,
            goals,
            current_phase: 'diagnostic',
            phase_progress: 0,
          });

        return !dbError;
      } catch (err: unknown) {
        if (isHubBackendUnavailable(err)) {
          return requestFallbackMentorship({ mentorId, menteeId, specialties, goals });
        }

        return false;
      } finally {
        setRequesting(false);
      }
    },
    [],
  );

  return { requestMentorship, requesting };
}
