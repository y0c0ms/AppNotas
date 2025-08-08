import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';
import { errorHandler } from './middleware/errorHandler.js';
import { config } from './config.js';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(compression());
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

app.get('/v1/health', (_req, res) => res.json({ ok: true }));

app.use('/v1/auth', authRoutes);
app.use('/v1/sync', syncRoutes);

app.use(errorHandler);


