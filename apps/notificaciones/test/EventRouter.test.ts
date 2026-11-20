import { describe, expect, it, vi } from 'vitest';
import type { EventEnvelope } from '@losrobles/shared';
import { EventRouter } from '../src/application/EventRouter.js';

const event: EventEnvelope = {
  id: '9d724d97-60ca-4ad3-be60-4195ac1b82c0',
  tipo: 'reserva.creada.v1',
  version: 1,
  ocurridoEn: '2026-11-20T12:00:00Z',
  correlationId: 'solicitud-1',
  datos: {},
};

describe('EventRouter', () => {
  it('despacha el evento al handler del tipo indicado', async () => {
    const handler = { handle: vi.fn().mockResolvedValue(undefined) };
    const other = { handle: vi.fn().mockResolvedValue(undefined) };
    const router = new EventRouter(
      new Map([
        [event.tipo, handler],
        ['usuario.registrado.v1', other],
      ]),
      { warn: vi.fn() },
    );
    await router.handle(event);
    expect(handler.handle).toHaveBeenCalledWith(event);
    expect(other.handle).not.toHaveBeenCalled();
  });

  it('avisa y finaliza normalmente con un tipo desconocido', async () => {
    const warn = vi.fn();
    const router = new EventRouter(new Map(), { warn });
    await expect(router.handle(event)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      { tipo: event.tipo, correlationId: event.correlationId },
      expect.any(String),
    );
  });
});
