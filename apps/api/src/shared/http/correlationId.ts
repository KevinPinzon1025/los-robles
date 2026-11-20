import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const CORRELATION_HEADER = 'x-correlation-id';

export const correlationId: RequestHandler = (req, res, next) => {
  const supplied = req.get(CORRELATION_HEADER);
  const id = supplied && /^[\x21-\x7e]{1,128}$/.test(supplied) ? supplied : randomUUID();
  res.setHeader(CORRELATION_HEADER, id);
  next();
};
