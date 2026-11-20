import { describe, expect, it } from 'vitest';
import { EventDataSchemas, EventEnvelopeSchema } from '../src/index.js';
import type { EventType } from '../src/index.js';

const inicio = '2026-11-20T12:00:00Z';
const destinatario = 'cliente@losrobles.test';
const envelope = {
  id: '9d724d97-60ca-4ad3-be60-4195ac1b82c0',
  version: 1,
  ocurridoEn: inicio,
  correlationId: 'solicitud-1',
};

const datos: Record<EventType, unknown> = {
  'usuario.registrado.v1': { idUsuario: 1, nombre: 'Ana', correo: destinatario },
  'reserva.creada.v1': {
    idReserva: 1,
    cancha: 'Cancha de Tenis',
    inicio,
    fin: '2026-11-20T13:00:00Z',
    valor: 70000,
    destinatario,
  },
  'reserva.cancelada.v1': { idReserva: 1, canceladaPor: 2, motivo: 'Solicitud', destinatario },
  'reserva.recordatorio.v1': { idReserva: 1, inicio, destinatario },
  'alquiler.vencido.v1': { idAlquiler: 1, implemento: 'Raqueta', destinatario },
};

describe('Contratos de eventos', () => {
  it.each(Object.entries(EventDataSchemas))('valida %s', (tipo, schema) => {
    const contenido = datos[tipo as EventType];
    expect(schema.safeParse(contenido).success).toBe(true);
    expect(EventEnvelopeSchema.safeParse({ ...envelope, tipo, datos: contenido }).success).toBe(
      true,
    );
  });

  it('rechaza un id o una versión inválida y los datos ausentes', () => {
    const tipo = 'usuario.registrado.v1';
    expect(EventEnvelopeSchema.safeParse({ ...envelope, tipo }).success).toBe(false);
    expect(
      EventEnvelopeSchema.safeParse({ ...envelope, id: 'incorrecto', tipo, datos: null }).success,
    ).toBe(false);
    expect(
      EventEnvelopeSchema.safeParse({ ...envelope, version: 0, tipo, datos: null }).success,
    ).toBe(false);
  });
});
