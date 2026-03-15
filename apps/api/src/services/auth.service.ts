import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';

const SALT_ROUNDS = 12;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
const REFRESH_EXPIRES_DAYS = 30;

function secret(key: string): Uint8Array {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return new TextEncoder().encode(val);
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
}

// ── Password helpers ──────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── Token helpers ─────────────────────────────────────────────────
export async function generateAccessToken(
  userId: string,
  email: string,
  role: string
): Promise<string> {
  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRES)
    .sign(secret('JWT_ACCESS_SECRET'));
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret('JWT_ACCESS_SECRET'));
  return {
    sub: payload.sub!,
    email: payload['email'] as string,
    role: payload['role'] as string,
  };
}

export async function issueTokenPair(
  userId: string,
  email: string,
  role: string
): Promise<TokenPair> {
  const accessToken = await generateAccessToken(userId, email, role);

  const rawRefresh = crypto.randomBytes(64).toString('hex');
  const hashedRefresh = await bcrypt.hash(rawRefresh, 10);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);

  await db.insert(refreshTokens).values({ userId, tokenHash: hashedRefresh, expiresAt });

  const refreshToken = await new SignJWT({ raw: rawRefresh })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_EXPIRES_DAYS}d`)
    .sign(secret('JWT_REFRESH_SECRET'));

  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(incomingToken: string): Promise<TokenPair> {
  let sub: string;
  let raw: string;

  try {
    const { payload } = await jwtVerify(incomingToken, secret('JWT_REFRESH_SECRET'));
    sub = payload.sub!;
    raw = payload['raw'] as string;
  } catch {
    throw new Error('Invalid or expired refresh token');
  }

  const stored = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.userId, sub), gt(refreshTokens.expiresAt, new Date())));

  let matchedId: string | null = null;
  for (const t of stored) {
    if (await bcrypt.compare(raw, t.tokenHash)) {
      matchedId = t.id;
      break;
    }
  }

  if (!matchedId) throw new Error('Refresh token not found or expired');

  await db.delete(refreshTokens).where(eq(refreshTokens.id, matchedId));

  const [user] = await db.select().from(users).where(eq(users.id, sub));
  if (!user) throw new Error('User not found');

  return issueTokenPair(sub, user.email, user.role);
}

export async function revokeRefreshToken(userId: string, incomingToken: string): Promise<void> {
  let raw: string;
  try {
    const { payload } = await jwtVerify(incomingToken, secret('JWT_REFRESH_SECRET'));
    raw = payload['raw'] as string;
  } catch {
    return;
  }

  const stored = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.userId, userId));

  for (const t of stored) {
    if (await bcrypt.compare(raw, t.tokenHash)) {
      await db.delete(refreshTokens).where(eq(refreshTokens.id, t.id));
      break;
    }
  }
}
