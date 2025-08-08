import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../prisma/client.js';

const ACCESS_TTL: number = Number(process.env.ACCESS_TTL_SECONDS || 15 * 60); // default 15m seconds
const REFRESH_TTL_SECONDS = Number(process.env.REFRESH_TTL_SECONDS || 60 * 60 * 24 * 30); // 30 days
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export function generateAccessToken(userId: string, deviceId?: string) {
  const options: SignOptions = { expiresIn: ACCESS_TTL, subject: userId };
  return jwt.sign({ deviceId }, JWT_SECRET as any, options);
}

export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function persistRefreshToken(userId: string, deviceId: string, rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TTL_SECONDS * 1000);
  await prisma.refreshToken.create({ data: { userId, deviceId, tokenHash, expiresAt } });
}

export async function rotateRefreshToken(userId: string, deviceId: string, oldRawToken: string) {
  const oldHash = hashToken(oldRawToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: oldHash } });
  if (!existing || existing.userId !== userId || existing.deviceId !== deviceId || existing.revokedAt || existing.expiresAt < new Date()) {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401, code: 'invalid_refresh' });
  }
  await prisma.refreshToken.update({ where: { tokenHash: oldHash }, data: { revokedAt: new Date() } });
  const newRaw = generateOpaqueToken();
  await persistRefreshToken(userId, deviceId, newRaw);
  return newRaw;
}

export async function revokeRefreshToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revokedAt: new Date() } });
}


