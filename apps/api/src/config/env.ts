export type ApiEnvironment = 'development' | 'test' | 'production';
export type AuthProviderMode = 'auto' | 'dev-header' | 'supabase-bridge' | 'entra-jwt';

export interface EntraAuthConfig {
  tenantId: string;
  audience: string;
  issuer: string;
  jwksUri: string;
  roleClaim: string;
}

export interface AppConfig {
  appName: string;
  env: ApiEnvironment;
  port: number;
  host: string;
  authProviderMode: AuthProviderMode;
  allowDevAuthProvider: boolean;
  corsAllowedOrigins: string[];
  rateLimit: {
    max: number;
    windowMs: number;
  };
  entra: EntraAuthConfig;
}

function normalizeEnv(value: string | undefined): ApiEnvironment {
  if (value === 'production' || value === 'test') {
    return value;
  }

  return 'development';
}

function normalizeAuthProviderMode(value: string | undefined): AuthProviderMode {
  if (
    value === 'dev-header' ||
    value === 'supabase-bridge' ||
    value === 'entra-jwt'
  ) {
    return value;
  }

  return 'auto';
}

function trim(value: string | undefined): string {
  return (value || '').trim();
}

function parseBoolean(value: string | undefined): boolean {
  return (value || '').trim().toLowerCase() === 'true';
}

function parseCsv(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function defaultCorsAllowedOrigins(env: ApiEnvironment): string[] {
  if (env === 'production') {
    return [];
  }

  return [
    'http://localhost:3000',
    'http://localhost:4173',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4173',
    'http://127.0.0.1:5173',
  ];
}

function deriveEntraJwksUri(issuer: string, explicitJwksUri: string): string {
  if (explicitJwksUri) {
    return explicitJwksUri;
  }

  if (!issuer) {
    return '';
  }

  const normalizedIssuer = issuer.replace(/\/+$/, '').replace(/\/v2\.0$/, '');
  return `${normalizedIssuer}/discovery/v2.0/keys`;
}

export function loadConfig(): AppConfig {
  const env = normalizeEnv(process.env.NODE_ENV);
  const issuer = trim(process.env.ENTRA_ISSUER);
  const explicitJwksUri = trim(process.env.ENTRA_JWKS_URI);
  const corsAllowedOrigins = parseCsv(process.env.CORS_ALLOWED_ORIGINS);

  return {
    appName: process.env.APP_NAME || 'radar-api',
    env,
    port: Number(process.env.PORT || 3001),
    host: process.env.HOST || '0.0.0.0',
    authProviderMode: normalizeAuthProviderMode(process.env.AUTH_PROVIDER),
    allowDevAuthProvider: parseBoolean(process.env.ALLOW_DEV_AUTH_PROVIDER),
    corsAllowedOrigins:
      corsAllowedOrigins.length > 0 ? corsAllowedOrigins : defaultCorsAllowedOrigins(env),
    rateLimit: {
      max: parsePositiveInteger(process.env.RATE_LIMIT_MAX, 120),
      windowMs: parsePositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    },
    entra: {
      tenantId: trim(process.env.ENTRA_TENANT_ID),
      audience: trim(process.env.ENTRA_AUDIENCE),
      issuer,
      jwksUri: deriveEntraJwksUri(issuer, explicitJwksUri),
      roleClaim: trim(process.env.ENTRA_ROLE_CLAIM) || 'roles',
    },
  };
}
