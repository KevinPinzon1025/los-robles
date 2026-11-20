import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import knex from 'knex';
import type { Knex } from 'knex';
import { getContainerRuntimeClient } from 'testcontainers';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createKnex } from '../src/db/knex.js';
import { createLogger } from '../src/shared/infrastructure/logger.js';

const dockerAvailable = await getContainerRuntimeClient().then(
  () => true,
  (err: unknown) => {
    if (process.env.CI) throw err;
    createLogger().warn('Integración PostgreSQL omitida: Docker no está disponible');
    return false;
  },
);

const tablasCore = [
  'usuario',
  'cliente',
  'administrador',
  'disciplina',
  'cancha',
  'reserva',
  'implemento',
  'alquiler',
  'outbox',
];

describe.skipIf(!dockerAvailable)('Migraciones y semillas en PostgreSQL 17', () => {
  const clave = randomUUID();
  let container: StartedPostgreSqlContainer | undefined;
  let db: Knex;
  let notif: Knex | undefined;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine')
      .withEnvironment({
        CORE_DB_USER: 'losrobles_core',
        CORE_DB_PASSWORD: clave,
        NOTIF_DB_USER: 'losrobles_notif',
        NOTIF_DB_PASSWORD: clave,
      })
      .withCopyFilesToContainer([
        {
          source: fileURLToPath(
            new URL('../../../infra/postgres/init/01-esquemas.sh', import.meta.url),
          ),
          target: '/docker-entrypoint-initdb.d/01-esquemas.sh',
          mode: 0o755,
        },
      ])
      .start();
    const url = new URL(container.getConnectionUri());
    url.username = 'losrobles_core';
    url.password = clave;
    db = createKnex(url.href);
    url.username = 'losrobles_notif';
    notif = knex({ client: 'pg', connection: url.href });
    vi.stubEnv('SEED_DEFAULT_PASSWORD', clave);
    await db.migrate.latest();
    await db.seed.run();
  }, 120000);

  afterAll(async () => {
    vi.unstubAllEnvs();
    try {
      await Promise.all([db?.destroy(), notif?.destroy()]);
    } finally {
      await container?.stop();
    }
  }, 30000);

  it('sube, revierte y vuelve a aplicar la migración con el rol de la API', async () => {
    for (const tabla of tablasCore) expect(await db.schema.hasTable(tabla)).toBe(true);
    await db.migrate.rollback(undefined, true);
    for (const tabla of tablasCore) expect(await db.schema.hasTable(tabla)).toBe(false);
    await db.migrate.latest();
    await db.seed.run();
  });

  async function datosReserva() {
    const cancha = await db<{ id_cancha: number }>('cancha').select('id_cancha').first();
    const admin = await db<{ id_usuario: number }>('administrador').select('id_usuario').first();
    if (!cancha || !admin) throw new Error('Faltan los datos semilla de la prueba.');
    return {
      id_cancha: cancha.id_cancha,
      creada_por: admin.id_usuario,
      tipo: 'TERCERO',
      nombre_tercero: 'Identidad de prueba',
      contacto_tercero: '3000000001',
      inicio: '2026-11-23T13:00:00Z',
      fin: '2026-11-23T14:00:00Z',
      valor: 80000,
    };
  }

  it('rechaza un solapamiento activo y permite reusar el turno cancelado', async () => {
    const primera = await datosReserva();
    const segunda = { ...primera, inicio: '2026-11-23T13:30:00Z', fin: '2026-11-23T14:30:00Z' };
    const [inserted] = await db('reserva')
      .insert(primera)
      .returning<{ id_reserva: number }[]>('id_reserva');
    if (!inserted) throw new Error('No se creó la reserva de prueba.');
    await expect(db('reserva').insert(segunda)).rejects.toMatchObject({
      code: '23P01',
      constraint: 'reserva_sin_solapamiento',
    });
    await db('reserva').where('id_reserva', inserted.id_reserva).update({ estado: 'CANCELADA' });
    await expect(db('reserva').insert(segunda)).resolves.toBeDefined();
    await expect(
      db('reserva').insert({ ...primera, inicio: segunda.fin, fin: '2026-11-23T15:30:00Z' }),
    ).resolves.toBeDefined();
  });

  it('rechaza una reserva de tercero sin nombre', async () => {
    await expect(
      db('reserva').insert({ ...(await datosReserva()), nombre_tercero: null }),
    ).rejects.toMatchObject({ code: '23514', constraint: 'reserva_datos_segun_tipo' });
  });

  it('conserva una sola fila por clave natural y hashes bcrypt de coste 12', async () => {
    const selectUsuarios = () =>
      db<{ correo: string; contrasena_hash: string }>('usuario')
        .select('correo', 'contrasena_hash')
        .orderBy('correo');
    const originales = await selectUsuarios();
    await db.seed.run();
    const repetidos = await selectUsuarios();
    expect(repetidos).toHaveLength(3);
    expect(repetidos).toEqual(originales);
    for (const row of repetidos) {
      expect(bcrypt.getRounds(row.contrasena_hash)).toBe(12);
      expect(await bcrypt.compare(clave, row.contrasena_hash)).toBe(true);
    }
    for (const [tabla, esperado] of [
      ['disciplina', 4],
      ['cancha', 4],
      ['implemento', 5],
      ['cliente', 2],
      ['administrador', 1],
    ] as const) {
      const [total] = await db(tabla).count<{ count: string }[]>('* as count');
      expect(Number(total?.count)).toBe(esperado);
    }
  });

  it('aísla los roles en su propio esquema', async () => {
    if (!notif) throw new Error('Falta la conexión de notificaciones.');
    await notif.schema.withSchema('notificaciones').createTable('prueba_aislamiento', (table) => {
      table.integer('id').primary();
    });
    try {
      await expect(db.raw('SELECT * FROM notificaciones.prueba_aislamiento')).rejects.toMatchObject(
        { code: '42501' },
      );
      await expect(notif.raw('SELECT * FROM core.usuario')).rejects.toMatchObject({
        code: '42501',
      });
    } finally {
      await notif.schema.withSchema('notificaciones').dropTable('prueba_aislamiento');
    }
  });
});
