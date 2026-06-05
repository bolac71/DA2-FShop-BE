type EnvValue = string | undefined;

const REQUIRED_IN_ALL_ENVIRONMENTS = ['PORT'] as const;

const REQUIRED_IN_PRODUCTION = [
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
  'JWT_SECRET',
  'REDIS_HOST',
  'REDIS_PORT',
] as const;

function hasValue(value: EnvValue): boolean {
  return value !== undefined && value.trim() !== '';
}

function assertNumber(env: Record<string, EnvValue>, key: string): void {
  const value = env[key];
  if (hasValue(value) && Number.isNaN(Number(value))) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
}

export function validateEnv(config: Record<string, EnvValue>) {
  const nodeEnv = config.NODE_ENV ?? 'development';
  const requiredKeys = [
    ...REQUIRED_IN_ALL_ENVIRONMENTS,
    ...(nodeEnv === 'production' ? REQUIRED_IN_PRODUCTION : []),
  ];

  const missingKeys = requiredKeys.filter((key) => !hasValue(config[key]));

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.join(', ')}`,
    );
  }

  assertNumber(config, 'PORT');
  assertNumber(config, 'DATABASE_PORT');
  assertNumber(config, 'REDIS_PORT');

  return config;
}
