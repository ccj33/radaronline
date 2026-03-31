import { afterEach, describe, expect, it } from 'vitest';

import {
  getFallbackMentors,
  getFallbackMentorshipMatches,
  requestFallbackMentorship,
} from './mentorshipFallbackStore';

describe('mentorshipFallbackStore', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('ships seeded mentors for local hub mode', () => {
    expect(getFallbackMentors({ verifiedOnly: true }).length).toBeGreaterThan(0);
  });

  it('creates local mentorship requests', () => {
    const mentor = getFallbackMentors()[0];

    expect(
      requestFallbackMentorship({
        mentorId: mentor.userId,
        menteeId: 'user-local',
        specialties: mentor.specialties.slice(0, 1),
        goals: 'Preciso de apoio na implantacao.',
      }),
    ).toBe(true);

    expect(getFallbackMentorshipMatches('user-local')).toHaveLength(1);
  });
});
