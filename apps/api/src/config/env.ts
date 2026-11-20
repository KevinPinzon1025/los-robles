import { z } from 'zod';

const flag = z.enum(['true', 'false']).transform((value) => value === 'true');

const ApiEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/ }),
    RABBITMQ_URL: z.url({ protocol: /^amqps?$/ }),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.url({ protocol: /^https?$/ }))),
    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
      .default('info'),
    ENABLE_DOCS: flag.prefault('true'),
    SEED_ON_START: flag.prefault('false'),
    SEED_DEFAULT_PASSWORD: z.string().optional(),
  })
  .refine((env) => !env.SEED_ON_START || !!env.SEED_DEFAULT_PASSWORD, {
    path: ['SEED_DEFAULT_PASSWORD'],
    message: 'Define una contraseña para ejecutar los datos semilla.',
  });

export type ApiEnv = z.infer<typeof ApiEnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const result = ApiEnvSchema.safeParse(source);
  if (!result.success) {
    const variables = [...new Set(result.error.issues.map(({ path }) => path.join('.')))];
    throw new Error(`Variables de entorno de la API ausentes o inválidas: ${variables.join(', ')}`);
  }
  return result.data;
}
