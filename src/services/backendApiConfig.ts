function normalizeBaseUrl(value: string | undefined): string {
  return (value || '').trim().replace(/\/+$/, '');
}

function normalizeFlagValue(value: string | undefined): string {
  return (value || '').trim().toLowerCase();
}

function isFlagEnabled(value: string | undefined): boolean {
  return normalizeFlagValue(value) === 'true';
}

function isFlagDisabled(value: string | undefined): boolean {
  return normalizeFlagValue(value) === 'false';
}

function shouldUseBackendByDefault(flagValue: string | undefined): boolean {
  return hasBackendApiConfig() && !isFlagDisabled(flagValue);
}

export function isLegacySupabaseAdminFlowDisabled(): boolean {
  return isFlagEnabled(import.meta.env.VITE_DISABLE_LEGACY_SUPABASE_ADMIN_FLOW);
}

export function shouldDisableLegacyHubModules(): boolean {
  if (isFlagEnabled(import.meta.env.VITE_ALLOW_UNSUPPORTED_HUB_MODULES)) {
    return false;
  }

  if (isFlagEnabled(import.meta.env.VITE_DISABLE_UNSUPPORTED_HUB_MODULES)) {
    return true;
  }

  return hasBackendApiConfig() || import.meta.env.PROD;
}

export function getBackendApiBaseUrl(): string {
  return normalizeBaseUrl(import.meta.env.VITE_BACKEND_API_URL);
}

export function hasBackendApiConfig(): boolean {
  return getBackendApiBaseUrl().length > 0;
}

export function shouldUseBackendAdminUsersApi(): boolean {
  return (
    hasBackendApiConfig() &&
    (isLegacySupabaseAdminFlowDisabled() ||
      !isFlagDisabled(import.meta.env.VITE_USE_BACKEND_ADMIN_USERS))
  );
}

export function shouldUseBackendActionsApi(): boolean {
  return shouldUseBackendByDefault(import.meta.env.VITE_USE_BACKEND_ACTIONS);
}

export function shouldUseBackendRequestsApi(): boolean {
  return hasBackendApiConfig() && isFlagEnabled(import.meta.env.VITE_USE_BACKEND_REQUESTS);
}

export function shouldUseBackendAnnouncementsApi(): boolean {
  return shouldUseBackendByDefault(import.meta.env.VITE_USE_BACKEND_ANNOUNCEMENTS);
}

export function shouldUseBackendCommentsApi(): boolean {
  return shouldUseBackendByDefault(import.meta.env.VITE_USE_BACKEND_COMMENTS);
}

export function shouldUseBackendAuthProfileApi(): boolean {
  return (
    hasBackendApiConfig() &&
    (isLegacySupabaseAdminFlowDisabled() ||
      !isFlagDisabled(import.meta.env.VITE_USE_BACKEND_AUTH_PROFILE))
  );
}

export function shouldUseBackendTagsApi(): boolean {
  return shouldUseBackendByDefault(import.meta.env.VITE_USE_BACKEND_TAGS);
}

export function shouldUseBackendTeamsApi(): boolean {
  return shouldUseBackendByDefault(import.meta.env.VITE_USE_BACKEND_TEAMS);
}

export function shouldUseBackendObjectivesActivitiesApi(): boolean {
  return shouldUseBackendByDefault(import.meta.env.VITE_USE_BACKEND_OBJECTIVES_ACTIVITIES);
}

export function shouldUseBackendAuthSessionApi(): boolean {
  return shouldUseBackendByDefault(import.meta.env.VITE_USE_BACKEND_AUTH_SESSION);
}
