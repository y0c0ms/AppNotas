import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';
import notesRoutes from './routes/notes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { config } from './config.js';
import compression, { CompressionOptions } from 'compression';
import rateLimit, { Options as RateLimitOptions } from 'express-rate-limit';

export const app = express();

// Behind Render proxy, trust X-Forwarded-* headers for rate limiting and IPs
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
const compOpts: CompressionOptions = {};
app.use(compression(compOpts) as any);
const limiter = rateLimit({ windowMs: 60_000, limit: 100 } as RateLimitOptions);
app.use(limiter as any);

app.get('/v1/health', (_req, res) => res.json({ ok: true }));

app.use('/v1/auth', authRoutes);
app.use('/v1/sync', syncRoutes);
app.use('/v1/notes', notesRoutes);

app.use(errorHandler);


