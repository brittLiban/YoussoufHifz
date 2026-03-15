import { FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { verifyAccessToken, JWTPayload } from '../services/auth.service';

// Extend FastifyRequest with a nullable user — null before auth is applied
declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload | null;
  }
}

const PUBLIC_PATHS = ['/health', '/auth/register', '/auth/login', '/auth/refresh'];

export const authMiddleware = fp(async (app) => {
  // decorateRequest requires a getter/setter or a primitive default.
  // Use getter pattern so TypeScript is satisfied.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorateRequest('user', null as any);

  app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    // Skip public routes
    if (PUBLIC_PATHS.some((p) => req.url.startsWith(p))) return;

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing authorization header' });
    }

    const token = authHeader.slice(7);
    try {
      req.user = await verifyAccessToken(token);
    } catch {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }
  });
});
