import { z } from 'zod';

const NotificacionesEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  RABBITMQ_URL: z.url({ protocol: /^amqps?$/ }),
  NOTIF_DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/ }),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  MAIL_FROM: z.string().trim().min(1),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  PREFETCH: z.coerce.number().int().min(1).max(65535).default(10),
});

export type NotificacionesEnv = z.infer<typeof NotificacionesEnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): NotificacionesEnv {
  const result = NotificacionesEnvSchema.safeParse(source);
  if (!result.success) {
    const variables = [...new Set(result.error.issues.map(({ path }) => path.join('.')))];
    throw new Error(`Variables de notificaciones ausentes o inválidas: ${variables.join(', ')}`);
  }
  return result.data;
}
