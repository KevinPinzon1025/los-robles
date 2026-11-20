import { HealthResponseSchema } from '@losrobles/shared';
import { httpClient } from '../../shared/api/httpClient.js';

export function getHealth(signal?: AbortSignal) {
  return httpClient('/health', HealthResponseSchema, { signal });
}
