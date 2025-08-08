export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'changeme',
  accessTtlSeconds: Number(process.env.ACCESS_TTL_SECONDS || 15 * 60),
  refreshTtlSeconds: Number(process.env.REFRESH_TTL_SECONDS || 60 * 60 * 24 * 30),
  corsOrigin: process.env.CORS_ORIGIN || '*',
};


