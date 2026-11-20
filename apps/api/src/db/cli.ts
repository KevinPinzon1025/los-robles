import { writeFile } from 'node:fs/promises';
import { createKnex } from './knex.js';
import { createLogger } from '../shared/infrastructure/logger.js';

const logger = createLogger();

async function main() {
  const [command, name] = process.argv.slice(2);
  if (command === 'make') {
    if (!name || !/^[a-z0-9][a-z0-9_-]*$/i.test(name)) {
      throw new Error(
        'Indica un nombre de migración con letras, números, guiones o guiones bajos.',
      );
    }
    const time = new Date().toISOString().replace(/\D/g, '');
    const filename = `${time}_${name}.ts`;
    await writeFile(
      new URL(`./migrations/${filename}`, import.meta.url),
      `import type { Knex } from 'knex';

export async function up(db: Knex): Promise<void> {
  void db;
}

export async function down(db: Knex): Promise<void> {
  void db;
}
`,
      { flag: 'wx' },
    );
    logger.info({ filename }, 'Migración creada');
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Define DATABASE_URL para conectar a PostgreSQL.');
  const db = createKnex(url);
  try {
    switch (command) {
      case 'migrate':
        await db.migrate.latest();
        break;
      case 'rollback':
        await db.migrate.rollback(undefined, process.argv.includes('--all'));
        break;
      case 'seed':
        await db.seed.run();
        break;
      default:
        throw new Error('Operación de base de datos desconocida.');
    }
    logger.info({ command }, 'Operación de base de datos completada');
  } finally {
    await db.destroy();
  }
}

void main().catch((err: unknown) => {
  logger.error({ err }, 'Falló la operación de base de datos');
  process.exitCode = 1;
});
