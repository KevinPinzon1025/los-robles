import type { Logger } from 'pino';
import { createKnex } from '../../db/knex.js';

export function createDatabase(url: string, logger: Logger) {
  const knex = createKnex(url);
  return {
    knex,
    async checkDb() {
      try {
        await knex.raw('SELECT 1').timeout(2000, { cancel: true });
        return true;
      } catch (err) {
        logger.debug({ err }, 'PostgreSQL no está disponible');
        return false;
      }
    },
    close: () => knex.destroy(),
  };
}
