import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthContext {
  userId: string;
  deviceId?: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'missing_authorization' });
  const token = header.replace(/^Bearer\s+/i, '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'changeme') as any;
    req.auth = { userId: payload.sub as string, deviceId: payload.deviceId as string | undefined };
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
}


