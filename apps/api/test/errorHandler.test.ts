import express from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../src/shared/domain/errors.js';
import { errorHandler } from '../src/shared/http/errorHandler.js';

const logger = pino({ level: 'silent' });

function appWithError(err: Error) {
  const app = express();
  app.get('/', () => {
    throw err;
  });
  app.use(errorHandler(logger));
  return app;
}

describe('errorHandler', () => {
  it.each([
    [new ValidationError('Datos incorrectos', ['correo']), 400],
    [new UnauthorizedError(), 401],
    [new ForbiddenError(), 403],
    [new NotFoundError(), 404],
    [new ConflictError('Franja ocupada'), 409],
    [new BusinessRuleError('Regla incumplida'), 422],
  ] as const)('convierte %s en HTTP %i', async (err, status) => {
    await request(appWithError(err))
      .get('/')
      .expect(status, {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      });
  });

  it('convierte un ZodError en 400', async () => {
    const parsed = z.object({ valor: z.number() }).safeParse({ valor: 'x' });
    if (parsed.success) throw new Error('La entrada de prueba debería fallar.');
    const response = await request(appWithError(parsed.error)).get('/').expect(400);
    expect(response.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR', details: [{ path: ['valor'] }] },
    });
  });

  it('responde 500 sin filtrar errores externos', async () => {
    await request(appWithError(new Error('detalle interno')))
      .get('/')
      .expect(500, {
        error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error interno.' },
      });
  });

  it('mantiene el formato JSON al rechazar un cuerpo inválido', async () => {
    const app = express();
    app.use(express.json({ limit: '100kb' }));
    app.post('/', (_req, res) => res.sendStatus(204));
    app.use(errorHandler(logger));
    await request(app)
      .post('/')
      .set('content-type', 'application/json')
      .send('{')
      .expect(400, {
        error: { code: 'INVALID_JSON', message: 'El JSON de la solicitud no es válido.' },
      });
    await request(app)
      .post('/')
      .send({ content: 'x'.repeat(102400) })
      .expect(413, {
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'La solicitud supera el tamaño permitido.' },
      });
  });
});
