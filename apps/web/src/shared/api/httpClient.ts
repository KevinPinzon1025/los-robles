import { ErrorResponseSchema } from '@losrobles/shared';
import type { ZodType } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

interface ClientOptions {
  baseUrl?: string;
  getToken?: () => string | undefined | Promise<string | undefined>;
}

function createCorrelationId() {
  return (
    globalThis.crypto.randomUUID?.() ??
    Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
  );
}

export function createHttpClient({
  baseUrl = import.meta.env.VITE_API_BASE || '/api/v1',
  getToken,
}: ClientOptions = {}) {
  return async function request<T>(
    path: string,
    schema: ZodType<T>,
    options: RequestOptions = {},
  ): Promise<T> {
    const { body, ...init } = options;
    const headers = new Headers(init.headers);
    headers.set('accept', 'application/json');
    if (!headers.has('x-correlation-id')) headers.set('x-correlation-id', createCorrelationId());
    const token = await getToken?.();
    if (token) headers.set('authorization', `Bearer ${token}`);
    if (body !== undefined) headers.set('content-type', 'application/json');

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`, {
      ...init,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const json: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const parsed = ErrorResponseSchema.safeParse(json);
      throw new ApiError(
        response.status,
        parsed.success ? parsed.data.error.code : 'HTTP_ERROR',
        parsed.success ? parsed.data.error.message : 'La API no pudo completar la solicitud.',
      );
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        response.status,
        'INVALID_RESPONSE',
        'La API devolvió una respuesta inesperada.',
      );
    }
    return parsed.data;
  };
}

export const httpClient = createHttpClient();
