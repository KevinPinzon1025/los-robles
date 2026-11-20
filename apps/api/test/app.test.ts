import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { AppContainer } from '../src/container.js';

const container: AppContainer = {
  config: { CORS_ORIGINS: ['http://localhost:5173'], ENABLE_DOCS: true },
  logger: pino({ level: 'silent' }),
  version: '0.1.0',
  uptime: () => 2,
  checkDb: () => Promise.resolve(true),
  checkRabbit: () => Promise.resolve(true),
};

describe('API HTTP', () => {
  it('responde 200 y conserva el identificador de correlación', async () => {
    await request(createApp(container))
      .get('/api/v1/health')
      .set('x-correlation-id', 'solicitud-1')
      .expect('x-correlation-id', 'solicitud-1')
      .expect(200, {
        status: 'ok',
        version: '0.1.0',
        uptimeSeg: 2,
        dependencias: { db: 'up', rabbitmq: 'up' },
      });
  });

  it('responde 503 al caer RabbitMQ y genera un identificador', async () => {
    const app = createApp({ ...container, checkRabbit: () => Promise.resolve(false) });
    const response = await request(app).get('/api/v1/health').expect(503);
    expect(response.headers['x-correlation-id']).toMatch(/^[\da-f-]{36}$/i);
    expect(response.body).toEqual({
      status: 'degraded',
      version: '0.1.0',
      uptimeSeg: 2,
      dependencias: { db: 'up', rabbitmq: 'down' },
    });
  });

  it('devuelve JSON con el contrato de error en una ruta inexistente', async () => {
    await request(createApp(container))
      .get('/api/v1/inexistente')
      .expect(404, {
        error: { code: 'NOT_FOUND', message: 'No se encontró el recurso solicitado.' },
      });
  });

  it('sirve Swagger y OpenAPI 3.1 cuando la documentación está habilitada', async () => {
    const app = createApp(container);
    const ui = await request(app).get('/api/docs').redirects(1).expect(200);
    expect(ui.text).toContain('Swagger UI');
    const response = await request(app).get('/api/docs/openapi.json').expect(200);
    expect(response.body).toMatchObject({ openapi: '3.1.0', paths: { '/health': { get: {} } } });
  });

  it('respeta la desactivación de Swagger', async () => {
    const app = createApp({ ...container, config: { ...container.config, ENABLE_DOCS: false } });
    await request(app).get('/api/docs').expect(404);
    await request(app).get('/api/docs/openapi.json').expect(404);
  });

  it('aplica CORS solo a los orígenes permitidos', async () => {
    const app = createApp(container);
    await request(app)
      .get('/api/v1/health')
      .set('origin', 'http://localhost:5173')
      .expect('access-control-allow-origin', 'http://localhost:5173');
    const response = await request(app).get('/api/v1/health').set('origin', 'https://ejemplo.test');
    expect(response.headers).not.toHaveProperty('access-control-allow-origin');
  });
});
