import { readdir } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import knex from 'knex';
import type { Knex } from 'knex';

export function createKnex(connection: string) {
  const extension = extname(fileURLToPath(import.meta.url));
  const migrations = new URL('./migrations/', import.meta.url);
  return knex({
    client: 'pg',
    connection: { connectionString: connection, connectionTimeoutMillis: 5000 },
    pool: { min: 0, max: 10 },
    acquireConnectionTimeout: 5000,
    searchPath: ['core'],
    migrations: {
      schemaName: 'core',
      migrationSource: {
        async getMigrations() {
          return (await readdir(migrations)).filter((file) => extname(file) === extension).sort();
        },
        // El historial de Knex se comparte entre tsx y la versión compilada.
        getMigrationName: (file: string) => basename(file, extension),
        getMigration: (file: string): Promise<Knex.Migration> =>
          import(new URL(file, migrations).href),
      },
    },
    seeds: {
      directory: fileURLToPath(new URL('./seeds/', import.meta.url)),
      loadExtensions: [extension],
    },
  });
}
