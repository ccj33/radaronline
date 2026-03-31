import cors from '@fastify/cors';
import Fastify from 'fastify';

import { loadConfig } from './config/env.js';
import { registerActionRoutes } from './modules/actions/actions.routes.js';
import { registerAnnouncementsRoutes } from './modules/announcements/announcements.routes.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { registerCommentsRoutes } from './modules/comments/comments.routes.js';
import { registerHealthRoutes } from './modules/health/health.routes.js';
import { registerObjectivesActivitiesRoutes } from './modules/objectivesActivities/objectivesActivities.routes.js';
import { registerRequestsRoutes } from './modules/requests/requests.routes.js';
import { registerTagsRoutes } from './modules/tags/tags.routes.js';
import { registerTeamsRoutes } from './modules/teams/teams.routes.js';
import { registerUsersRoutes } from './modules/users/users.routes.js';
import { createAuthProvider } from './shared/auth/auth-provider.factory.js';
import { problem } from './shared/http/problem.js';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export function buildApp() {
  const config = loadConfig();
  const rateLimitBuckets = new Map<string, RateLimitBucket>();
  const app = Fastify({
    logger: {
      level: config.env === 'production' ? 'info' : 'debug',
    },
    requestIdHeader: 'x-correlation-id',
    requestIdLogLabel: 'correlationId',
  });

  app.decorate('authProvider', createAuthProvider(config));
  app.decorate('authProviderSession', function authProviderSession(request) {
    return this.authProvider.getCurrentSession(request);
  });

  void app.register(cors, {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowed =
        config.corsAllowedOrigins.includes('*') ||
        config.corsAllowedOrigins.includes(origin);

      callback(null, allowed);
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['authorization', 'content-type', 'x-correlation-id'],
  });

  app.addHook('onRequest', async (request, reply) => {
    const pathname = request.url.split('?')[0];
    if (pathname === '/health' || request.method === 'OPTIONS') {
      return;
    }

    const now = Date.now();
    const key = `${request.ip}:${request.method}:${pathname}`;
    const current = rateLimitBuckets.get(key);

    if (!current || current.resetAt <= now) {
      rateLimitBuckets.set(key, {
        count: 1,
        resetAt: now + config.rateLimit.windowMs,
      });
      return;
    }

    current.count += 1;

    if (current.count > config.rateLimit.max) {
      reply.header('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      return problem(reply, 429, 'Too Many Requests', 'Rate limit exceeded.');
    }
  });

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('Cache-Control', 'no-store');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    return payload;
  });

  void registerHealthRoutes(app);
  void registerObjectivesActivitiesRoutes(app);
  void registerAuthRoutes(app);
  void registerActionRoutes(app);
  void registerAnnouncementsRoutes(app);
  void registerCommentsRoutes(app);
  void registerRequestsRoutes(app);
  void registerTagsRoutes(app);
  void registerTeamsRoutes(app);
  void registerUsersRoutes(app);

  return app;
}
