import type { ErrorRequestHandler } from 'express';
import type { ErrorResponse } from '@losrobles/shared';
import type { Logger } from 'pino';
import { z } from 'zod';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../domain/errors.js';
import { CORRELATION_HEADER } from './correlationId.js';

const domainStatuses = [
  [ValidationError, 400],
  [UnauthorizedError, 401],
  [ForbiddenError, 403],
  [NotFoundError, 404],
  [ConflictError, 409],
  [BusinessRuleError, 422],
] as const;

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err: unknown, _req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    for (const [ErrorType, status] of domainStatuses) {
      if (err instanceof ErrorType) {
        const { code, message, details } = err;
        res.status(status).json({ error: { code, message, details } } satisfies ErrorResponse);
        return;
      }
    }
    if (err instanceof z.ZodError) {
      const details = err.issues.map(({ path, code, message }) => ({ path, code, message }));
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Los datos de la solicitud no son válidos.',
          details,
        },
      } satisfies ErrorResponse);
      return;
    }
    if (err instanceof Error && 'type' in err) {
      if (err.type === 'entity.parse.failed') {
        res.status(400).json({
          error: { code: 'INVALID_JSON', message: 'El JSON de la solicitud no es válido.' },
        } satisfies ErrorResponse);
        return;
      }
      if (err.type === 'entity.too.large') {
        res.status(413).json({
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'La solicitud supera el tamaño permitido.',
          },
        } satisfies ErrorResponse);
        return;
      }
    }
    logger.error(
      { err, correlationId: res.getHeader(CORRELATION_HEADER) },
      'Error inesperado en la API',
    );
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error interno.' },
    } satisfies ErrorResponse);
  };
}
