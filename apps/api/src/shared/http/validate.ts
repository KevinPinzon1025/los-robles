import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

type Part = 'body' | 'query' | 'params';

export function validate(schemas: Partial<Record<Part, ZodType>>): RequestHandler {
  return async (req, _res, next) => {
    const parts: Part[] = ['body', 'query', 'params'];
    for (const part of parts) {
      const schema = schemas[part];
      if (schema) {
        const parsed = await schema.parseAsync(req[part]);
        // Express 5 expone query como getter. La ruta recibe la consulta ya validada.
        Object.defineProperty(req, part, { value: parsed, writable: true, configurable: true });
      }
    }
    next();
  };
}
