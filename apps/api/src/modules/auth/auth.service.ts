import type { SessionUser } from '../../shared/auth/auth.types.js';
import type { AuthProfile, AuthProfileRepository, CompleteFirstAccessInput } from './auth.repository.js';

export class AuthProfileService {
  constructor(private readonly repository: AuthProfileRepository) {}

  async getCurrentProfile(actor: SessionUser): Promise<AuthProfile> {
    const profile = await this.repository.getProfile(actor.id);

    if (profile) {
      return profile;
    }

    return {
      id: actor.id,
      email: actor.email,
      name: actor.name,
      role: actor.role,
      microregionId: actor.microregionId,
      active: true,
      lgpdAccepted: false,
      lgpdAcceptedAt: null,
      avatarId: null,
      municipality: null,
      firstAccess: false,
      createdAt: new Date().toISOString(),
    };
  }

  async acceptLgpd(actor: SessionUser): Promise<void> {
    await this.repository.acceptLgpd(actor.id);
  }

  async completeFirstAccess(
    actor: SessionUser,
    input: Omit<CompleteFirstAccessInput, 'userId' | 'userEmail'> & { userId: string; userEmail: string }
  ): Promise<void> {
    if (actor.id !== input.userId) {
      throw new Error('FORBIDDEN');
    }

    await this.repository.completeFirstAccess(input);
  }
}
