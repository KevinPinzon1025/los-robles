import { pino } from 'pino';
import type { NotificacionesEnv } from '../config/env.js';

export function createLogger(env?: Pick<NotificacionesEnv, 'NODE_ENV' | 'LOG_LEVEL'>) {
  return pino({
    level: env?.LOG_LEVEL ?? 'info',
    transport:
      env?.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: process.stdout.isTTY } }
        : undefined,
  });
}
