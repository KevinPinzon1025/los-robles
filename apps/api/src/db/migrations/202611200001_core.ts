import type { Knex } from 'knex';

const timestamps = `
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
`;
const tablas = [
  'usuario',
  'cliente',
  'administrador',
  'disciplina',
  'cancha',
  'reserva',
  'implemento',
  'alquiler',
  'outbox',
] as const;

export async function up(db: Knex): Promise<void> {
  await db.raw(`
    CREATE FUNCTION core.set_actualizado_en() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      NEW.actualizado_en := now();
      RETURN NEW;
    END;
    $$;

    CREATE TABLE core.usuario (
      id_usuario integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      primer_nombre varchar(50) NOT NULL,
      segundo_nombre varchar(50),
      primer_apellido varchar(50) NOT NULL,
      segundo_apellido varchar(50),
      correo varchar(120) NOT NULL,
      contrasena_hash varchar(100) NOT NULL,
      rol varchar(10) NOT NULL CHECK (rol IN ('CLIENTE', 'ADMIN')),
      estado varchar(10) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
      ${timestamps}
    );
    CREATE UNIQUE INDEX usuario_correo_unico ON core.usuario (lower(correo));

    CREATE TABLE core.cliente (
      id_usuario integer PRIMARY KEY REFERENCES core.usuario ON DELETE CASCADE,
      celular varchar(10) NOT NULL CHECK (celular ~ '^3[0-9]{9}$'),
      ${timestamps}
    );

    CREATE TABLE core.administrador (
      id_usuario integer PRIMARY KEY REFERENCES core.usuario ON DELETE CASCADE,
      fecha_inicio date NOT NULL DEFAULT current_date,
      ${timestamps}
    );

    CREATE TABLE core.disciplina (
      id_disciplina integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      nombre varchar(50) NOT NULL UNIQUE,
      descripcion varchar(500) NOT NULL,
      ${timestamps}
    );

    CREATE TABLE core.cancha (
      id_cancha integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      id_disciplina integer NOT NULL REFERENCES core.disciplina,
      nombre varchar(50) NOT NULL UNIQUE,
      estado varchar(15) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'INACTIVA', 'MANTENIMIENTO')),
      hora_apertura time NOT NULL,
      hora_cierre time NOT NULL,
      valor_hora numeric(10,0) NOT NULL CHECK (valor_hora > 0),
      CHECK (hora_apertura < hora_cierre),
      ${timestamps}
    );

    CREATE TABLE core.reserva (
      id_reserva integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      id_cancha integer NOT NULL REFERENCES core.cancha,
      tipo varchar(10) NOT NULL CHECK (tipo IN ('CLIENTE', 'TERCERO')),
      id_cliente integer REFERENCES core.cliente,
      nombre_tercero varchar(100),
      contacto_tercero varchar(20),
      creada_por integer NOT NULL REFERENCES core.usuario,
      inicio timestamptz NOT NULL,
      fin timestamptz NOT NULL,
      valor numeric(10,0) NOT NULL,
      estado varchar(10) NOT NULL DEFAULT 'PROGRAMADA' CHECK (estado IN ('PROGRAMADA', 'CANCELADA', 'CUMPLIDA')),
      motivo_cancelacion varchar(200),
      CHECK (fin > inicio),
      CONSTRAINT reserva_datos_segun_tipo CHECK (
        (tipo = 'CLIENTE' AND id_cliente IS NOT NULL AND nombre_tercero IS NULL) OR
        (tipo = 'TERCERO' AND id_cliente IS NULL AND nombre_tercero IS NOT NULL AND contacto_tercero IS NOT NULL)
      ),
      CONSTRAINT reserva_sin_solapamiento EXCLUDE USING gist (
        id_cancha public.gist_int4_ops WITH =, tstzrange(inicio, fin, '[)') WITH &&
      ) WHERE (estado = 'PROGRAMADA'),
      ${timestamps}
    );
    CREATE INDEX reserva_cliente_inicio ON core.reserva (id_cliente, inicio);
    CREATE INDEX reserva_cancha_inicio ON core.reserva (id_cancha, inicio);

    CREATE TABLE core.implemento (
      id_implemento integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      id_disciplina integer REFERENCES core.disciplina,
      nombre varchar(80) NOT NULL UNIQUE,
      stock_total integer NOT NULL CHECK (stock_total >= 0),
      estado varchar(15) NOT NULL CHECK (estado IN ('DISPONIBLE', 'NO_DISPONIBLE')),
      ${timestamps}
    );

    CREATE TABLE core.alquiler (
      id_alquiler integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      id_cliente integer NOT NULL REFERENCES core.cliente,
      id_implemento integer NOT NULL REFERENCES core.implemento,
      cantidad integer NOT NULL CHECK (cantidad > 0),
      fecha_prestamo timestamptz NOT NULL DEFAULT now(),
      fecha_limite timestamptz NOT NULL,
      fecha_devolucion timestamptz,
      estado varchar(10) NOT NULL CHECK (estado IN ('ACTIVO', 'DEVUELTO', 'VENCIDO')),
      ${timestamps}
    );

    CREATE TABLE core.outbox (
      id uuid PRIMARY KEY,
      tipo varchar(60) NOT NULL,
      payload jsonb NOT NULL,
      publicado_en timestamptz,
      intentos integer NOT NULL DEFAULT 0,
      ${timestamps}
    );
    CREATE INDEX outbox_pendientes ON core.outbox (creado_en) WHERE publicado_en IS NULL;
  `);

  for (const tabla of tablas) {
    await db.raw(
      'CREATE TRIGGER set_actualizado_en BEFORE UPDATE ON ?? FOR EACH ROW EXECUTE FUNCTION core.set_actualizado_en()',
      [`core.${tabla}`],
    );
  }
}

export async function down(db: Knex): Promise<void> {
  for (const tabla of [...tablas].reverse()) {
    await db.schema.withSchema('core').dropTable(tabla);
  }
  await db.raw('DROP FUNCTION core.set_actualizado_en()');
}
