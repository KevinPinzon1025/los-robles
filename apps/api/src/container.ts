import { createRequire } from 'node:module';
import type { Logger } from 'pino';
import { loadEnv } from './config/env.js';
import type { ApiEnv } from './config/env.js';
import { createDatabase } from './shared/infrastructure/database.js';
import { createLogger } from './shared/infrastructure/logger.js';
import { createRabbit } from './shared/infrastructure/rabbitmq.js';
import { systemClock } from './shared/infrastructure/systemClock.js';

const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

export interface AppContainer {
  config: Pick<ApiEnv, 'CORS_ORIGINS' | 'ENABLE_DOCS'>;
  logger: Logger;
  version: string;
  uptime: () => number;
  checkDb: () => Promise<boolean>;
  checkRabbit: () => Promise<boolean>;
}

export async function createContainer(config = loadEnv()) {
  const logger = createLogger(config);
  const database = createDatabase(config.DATABASE_URL, logger);
  try {
    await database.knex.migrate.latest();
    if (config.SEED_ON_START) await database.knex.seed.run();
  } catch (err) {
    await database.close();
    throw err;
  }

  const rabbit = createRabbit(config.RABBITMQ_URL, logger);
  const startedAt = systemClock.now().getTime();
  return {
    config,
    logger,
    version,
    uptime: () => Math.max(0, Math.floor((systemClock.now().getTime() - startedAt) / 1000)),
    checkDb: database.checkDb,
    checkRabbit: rabbit.checkRabbit,
    rabbit,
    async close() {
      await Promise.all([rabbit.close(), database.close()]);
    },
  } satisfies AppContainer & {
    config: ApiEnv;
    rabbit: typeof rabbit;
    close: () => Promise<void>;
  };
}
