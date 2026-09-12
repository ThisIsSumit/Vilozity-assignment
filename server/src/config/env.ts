import "dotenv/config";

const required = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
] as const;

function loadEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // Fail fast: booting with a silently-missing secret is a production
    // incident waiting to happen.
    // eslint-disable-next-line no-console
    console.error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
    process.exit(1);
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 4000),
    databaseUrl: process.env.DATABASE_URL!,
    clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    bullmqEnabled: process.env.BULLMQ_ENABLED === "true",
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET!,
      refreshSecret: process.env.JWT_REFRESH_SECRET!,
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
      refreshExpiresInMs: 7 * 24 * 60 * 60 * 1000,
    },
  };
}

export const env = loadEnv();
