import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // eslint-disable-next-line no-console
  console.error('[ERROR]', { message: err?.message, code: err?.code, stack: err?.stack });
  if (res.headersSent) return;
  const status = err.status || 500;
  res.status(status).json({ error: err.code || 'internal_error', message: err.message || 'Internal Server Error' });
}


