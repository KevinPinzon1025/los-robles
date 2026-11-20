import { z } from 'zod';
import { ErrorResponseSchema, HealthResponseSchema } from '@losrobles/shared';

const healthResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
});

export function openapi(version: string) {
  return {
    openapi: '3.1.0',
    info: { title: 'Centro Deportivo Los Robles', version },
    servers: [{ url: '/api/v1' }],
    paths: {
      '/health': {
        get: {
          summary: 'Consultar el estado de la API y sus dependencias',
          responses: {
            '200': healthResponse('Todas las dependencias están disponibles'),
            '503': healthResponse('Alguna dependencia no está disponible'),
            '500': {
              description: 'Error interno',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        HealthResponse: z.toJSONSchema(HealthResponseSchema),
        ErrorResponse: z.toJSONSchema(ErrorResponseSchema),
      },
    },
  };
}
