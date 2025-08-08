import { Request, Response } from 'express';
import * as svc from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, device } = req.body || {};
    if (!email || !password || !device?.name || !device?.platform) return res.status(400).json({ error: 'invalid_input' });
    const result = await svc.register(email, password, device);
    res.status(201).json(result);
  }),
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, device } = req.body || {};
    if (!email || !password || !device?.name || !device?.platform) return res.status(400).json({ error: 'invalid_input' });
    const result = await svc.login(email, password, device);
    res.json(result);
  }),
  refresh: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken, deviceId, userId } = req.body || {};
    if (!refreshToken || !deviceId || !userId) return res.status(400).json({ error: 'invalid_input' });
    const result = await svc.refresh(userId, deviceId, refreshToken);
    res.json(result);
  }),
  logout: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'invalid_input' });
    const result = await svc.logout(refreshToken);
    res.json(result);
  })
};


