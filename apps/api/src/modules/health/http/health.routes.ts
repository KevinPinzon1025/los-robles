import { Router } from 'express';
import type { HealthResponse } from '@losrobles/shared';
import type { AppContainer } from '../../../container.js';

export function healthRoutes(
  container: Pick<AppContainer, 'checkDb' | 'checkRabbit' | 'uptime' | 'version'>,
) {
  const router = Router();
  router.get('/health', async (_req, res) => {
    const [db, rabbitmq] = await Promise.all([container.checkDb(), container.checkRabbit()]);
    const ok = db && rabbitmq;
    const body: HealthResponse = {
      status: ok ? 'ok' : 'degraded',
      version: container.version,
      uptimeSeg: container.uptime(),
      dependencias: { db: db ? 'up' : 'down', rabbitmq: rabbitmq ? 'up' : 'down' },
    };
    res.status(ok ? 200 : 503).json(body);
  });
  return router;
}
