import argon2 from 'argon2';
import { prisma } from '../prisma/client.js';
import { generateAccessToken, generateOpaqueToken, persistRefreshToken, rotateRefreshToken, revokeRefreshToken } from './tokenService.js';

export async function register(email: string, password: string, device: { name: string; platform: string }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw Object.assign(new Error('Email already registered'), { status: 409, code: 'email_exists' });
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({ data: { email, passwordHash } });
  const deviceRec = await prisma.device.create({ data: { userId: user.id, name: device.name, platform: device.platform } });
  const accessToken = generateAccessToken(user.id, deviceRec.id);
  const refreshToken = generateOpaqueToken();
  await persistRefreshToken(user.id, deviceRec.id, refreshToken);
  return { userId: user.id, deviceId: deviceRec.id, accessToken, refreshToken };
}

export async function login(email: string, password: string, device: { name: string; platform: string }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401, code: 'invalid_credentials' });
  const ok = await argon2.verify(user.passwordHash, password);
  if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401, code: 'invalid_credentials' });
  const deviceRec = await prisma.device.create({ data: { userId: user.id, name: device.name, platform: device.platform } });
  const accessToken = generateAccessToken(user.id, deviceRec.id);
  const refreshToken = generateOpaqueToken();
  await persistRefreshToken(user.id, deviceRec.id, refreshToken);
  return { userId: user.id, deviceId: deviceRec.id, accessToken, refreshToken };
}

export async function refresh(userId: string, deviceId: string, refreshToken: string) {
  const newRefresh = await rotateRefreshToken(userId, deviceId, refreshToken);
  const accessToken = generateAccessToken(userId, deviceId);
  return { accessToken, refreshToken: newRefresh };
}

export async function logout(refreshToken: string) {
  await revokeRefreshToken(refreshToken);
  return { ok: true };
}


