import bcrypt from 'bcrypt';
import type { Knex } from 'knex';

const disciplinas = [
  ['Fútbol', 'Cancha de césped natural o sintético para partidos de fútbol.', 80000],
  ['Baloncesto', 'Cancha con tablero y aro, utilizada para juegos de baloncesto.', 60000],
  ['Voleibol', 'Cancha dividida por una red central para partidos de voleibol.', 50000],
  ['Tenis', 'Cancha con superficie dura, arcilla o césped, dividida por una red.', 70000],
] as const;

const implementos = [
  { nombre: 'Balón fútbol N°5', disciplina: 'Fútbol', stock_total: 10 },
  { nombre: 'Balón baloncesto', disciplina: 'Baloncesto', stock_total: 8 },
  { nombre: 'Red de voleibol', disciplina: 'Voleibol', stock_total: 5 },
  { nombre: 'Raqueta de tenis', disciplina: 'Tenis', stock_total: 12 },
  { nombre: 'Conos', disciplina: null, stock_total: 20 },
];

const usuarios = [
  { correo: 'admin@losrobles.test', primer_nombre: 'Administrador', rol: 'ADMIN', celular: null },
  {
    correo: 'cliente1@losrobles.test',
    primer_nombre: 'Cliente Uno',
    rol: 'CLIENTE',
    celular: '3000000001',
  },
  {
    correo: 'cliente2@losrobles.test',
    primer_nombre: 'Cliente Dos',
    rol: 'CLIENTE',
    celular: '3000000002',
  },
] as const;

export async function seed(db: Knex): Promise<void> {
  const password = process.env.SEED_DEFAULT_PASSWORD;
  if (!password) throw new Error('Define SEED_DEFAULT_PASSWORD para ejecutar los datos semilla.');
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('SEED_DEFAULT_PASSWORD debe tener 72 bytes o menos para bcrypt.');
  }
  const contrasena_hash = await bcrypt.hash(password, 12);

  await db.transaction(async (trx) => {
    const ids = new Map<string, number>();
    for (const [nombre, descripcion, valor_hora] of disciplinas) {
      const [row] = await trx<{ id_disciplina: number; nombre: string; descripcion: string }>(
        'disciplina',
      )
        .insert({ nombre, descripcion })
        .onConflict('nombre')
        .merge(['descripcion'])
        .returning('id_disciplina');
      if (!row) throw new Error(`No se pudo obtener la disciplina ${nombre}.`);
      ids.set(nombre, row.id_disciplina);
      await trx('cancha')
        .insert({
          id_disciplina: row.id_disciplina,
          nombre: `Cancha ${nombre} 1`,
          hora_apertura: '06:00',
          hora_cierre: '22:00',
          valor_hora,
        })
        .onConflict('nombre')
        .merge(['id_disciplina', 'hora_apertura', 'hora_cierre', 'valor_hora']);
    }

    for (const { disciplina, ...implemento } of implementos) {
      await trx('implemento')
        .insert({
          ...implemento,
          id_disciplina: disciplina ? ids.get(disciplina) : null,
          estado: 'DISPONIBLE',
        })
        .onConflict('nombre')
        .merge(['id_disciplina', 'stock_total']);
    }

    for (const { celular, ...usuario } of usuarios) {
      const [row] = await trx<{
        id_usuario: number;
        correo: string;
        primer_nombre: string;
        primer_apellido: string;
        rol: string;
        contrasena_hash: string;
      }>('usuario')
        .insert({ ...usuario, primer_apellido: 'Los Robles', contrasena_hash })
        .onConflict(trx.raw('(lower(correo))'))
        .merge(['primer_nombre', 'primer_apellido'])
        .returning(['id_usuario', 'rol']);
      if (!row || row.rol !== usuario.rol) {
        throw new Error(`El usuario semilla ${usuario.correo} no tiene el rol esperado.`);
      }
      if (celular) {
        await trx('cliente')
          .insert({ id_usuario: row.id_usuario, celular })
          .onConflict('id_usuario')
          .merge(['celular']);
      } else {
        await trx('administrador')
          .insert({ id_usuario: row.id_usuario })
          .onConflict('id_usuario')
          .ignore();
      }
    }
  });
}
