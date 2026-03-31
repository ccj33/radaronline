import type { AppConfig } from '../../config/env.js';
import { DevHeaderAuthProvider } from './dev-auth.provider.js';
import { EntraJwtAuthProvider } from './entra-jwt.provider.js';
import type { AuthProvider } from './auth.provider.js';
import { SupabaseBridgeAuthProvider } from './supabase-bridge-auth.provider.js';
import { hasSupabaseAdminConfig } from '../persistence/supabase-admin.js';

export function createAuthProvider(config: AppConfig): AuthProvider {
  const canUseDevAuthProvider = config.env !== 'production' || config.allowDevAuthProvider;

  switch (config.authProviderMode) {
    case 'dev-header':
      if (!canUseDevAuthProvider) {
        throw new Error('DEV_AUTH_PROVIDER_DISABLED');
      }
      return new DevHeaderAuthProvider();
    case 'supabase-bridge':
      return new SupabaseBridgeAuthProvider();
    case 'entra-jwt':
      return new EntraJwtAuthProvider(config.entra);
    case 'auto':
    default:
      if (config.entra.issuer && config.entra.audience && config.entra.jwksUri) {
        return new EntraJwtAuthProvider(config.entra);
      }

      if (hasSupabaseAdminConfig()) {
        return new SupabaseBridgeAuthProvider();
      }

      if (!canUseDevAuthProvider) {
        throw new Error('AUTH_PROVIDER_NOT_CONFIGURED');
      }

      return new DevHeaderAuthProvider();
  }
}
