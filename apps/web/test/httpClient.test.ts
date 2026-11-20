import { afterEach, describe, expect, it, vi } from 'vitest';
import { HealthResponseSchema } from '@losrobles/shared';
import { ApiError, createHttpClient } from '../src/shared/api/httpClient.js';

afterEach(() => vi.unstubAllGlobals());

describe('httpClient', () => {
  it('convierte el contrato de error en ApiError y envía un id de correlación', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: 'NOT_FOUND', message: 'No se encontró el recurso.' } }),
          { status: 404 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const request = createHttpClient({ baseUrl: '/api/v1' });
    const result = request('/health', HealthResponseSchema);
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'No se encontró el recurso.',
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/v1/health');
    expect(new Headers(init?.headers).get('x-correlation-id')).toMatch(/^.+$/);
  });
});
