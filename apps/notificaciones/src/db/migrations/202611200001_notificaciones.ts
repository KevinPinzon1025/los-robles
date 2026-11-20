import type { Knex } from 'knex';

export async function up(db: Knex): Promise<void> {
  await db.raw(`
    CREATE TABLE notificaciones.mensaje_procesado (
      id_mensaje uuid PRIMARY KEY,
      tipo varchar(60) NOT NULL,
      procesado_en timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE notificaciones.notificacion (
      id_notificacion bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      id_mensaje uuid NOT NULL,
      tipo varchar(60) NOT NULL,
      destinatario varchar(120) NOT NULL,
      estado varchar(10) NOT NULL CHECK (estado IN ('ENVIADA', 'FALLIDA')),
      intentos integer NOT NULL DEFAULT 0,
      error text,
      enviado_en timestamptz,
      creado_en timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function down(db: Knex): Promise<void> {
  await db.schema.withSchema('notificaciones').dropTable('notificacion');
  await db.schema.withSchema('notificaciones').dropTable('mensaje_procesado');
}
