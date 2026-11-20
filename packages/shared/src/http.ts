import { z } from 'zod';

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.unknown()).optional(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

const EstadoDependencia = z.enum(['up', 'down']);
export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string(),
  uptimeSeg: z.number().int().nonnegative(),
  dependencias: z.object({ db: EstadoDependencia, rabbitmq: EstadoDependencia }),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
