function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  NEXTAUTH_SECRET: requireEnv("NEXTAUTH_SECRET"),
  NEXTAUTH_URL: requireEnv("NEXTAUTH_URL"),
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? null,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET ?? null,
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? null,
  CRON_SECRET: process.env.CRON_SECRET ?? null,
};
