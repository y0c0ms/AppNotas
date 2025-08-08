import { Request, Response } from 'express';
import * as svc from '../services/syncService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const syncController = {
  sync: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const result = await svc.sync(userId, req.body || {});
    res.json(result);
  })
};


