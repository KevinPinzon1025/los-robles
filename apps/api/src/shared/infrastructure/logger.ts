import { pino } from 'pino';
import type { ApiEnv } from '../../config/env.js';

export function createLogger(env?: Pick<ApiEnv, 'NODE_ENV' | 'LOG_LEVEL'>) {
  return pino({
    level: env?.LOG_LEVEL ?? 'info',
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    transport:
      env?.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: process.stdout.isTTY } }
        : undefined,
  });
}
