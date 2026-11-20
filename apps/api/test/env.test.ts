import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';

const env = {
  DATABASE_URL: 'postgres://localhost/losrobles',
  RABBITMQ_URL: 'amqp://localhost',
};

describe('Entorno de la API', () => {
  it('informa qué conexión falta al arrancar', () => {
    expect(() => loadEnv({ RABBITMQ_URL: env.RABBITMQ_URL })).toThrow(/DATABASE_URL/);
  });

  it('valida los flags y separa los orígenes', () => {
    const config = loadEnv({
      ...env,
      ENABLE_DOCS: 'false',
      CORS_ORIGINS: 'http://localhost:5173, https://web.test',
    });
    expect(config.ENABLE_DOCS).toBe(false);
    expect(config.SEED_ON_START).toBe(false);
    expect(config.CORS_ORIGINS).toEqual(['http://localhost:5173', 'https://web.test']);
  });

  it('exige una contraseña cuando se habilitan los seeds', () => {
    expect(() => loadEnv({ ...env, SEED_ON_START: 'true' })).toThrow(/SEED_DEFAULT_PASSWORD/);
  });
});
