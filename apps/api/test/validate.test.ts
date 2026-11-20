import express from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../src/shared/http/errorHandler.js';
import { validate } from '../src/shared/http/validate.js';

const app = express();
app.use(express.json());
app.post(
  '/:id',
  validate({
    params: z.object({ id: z.coerce.number().int().positive() }),
    query: z.object({ pagina: z.coerce.number().int().positive() }),
    body: z.object({ nombre: z.string().trim().min(1) }),
  }),
  (req, res) => {
    res.json({ params: req.params, query: req.query, body: req.body });
  },
);
app.use(errorHandler(pino({ level: 'silent' })));

describe('validate', () => {
  it('entrega a la ruta params, query y body analizados', async () => {
    await request(app)
      .post('/3?pagina=2&ignorar=1')
      .send({ nombre: ' Ana ', ignorar: true })
      .expect(200, { params: { id: 3 }, query: { pagina: 2 }, body: { nombre: 'Ana' } });
  });

  it('rechaza antes de llamar al handler', async () => {
    const response = await request(app)
      .post('/3?pagina=incorrecta')
      .send({ nombre: 'Ana' })
      .expect(400);
    expect(response.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR', details: [{ path: ['pagina'] }] },
    });
  });
});
