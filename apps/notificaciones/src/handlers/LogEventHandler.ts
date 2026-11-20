import type { EventEnvelope } from '@losrobles/shared';
import type { Logger } from 'pino';
import type { EventHandler } from '../application/ports.js';

export class LogEventHandler implements EventHandler {
  constructor(private readonly logger: Logger) {}

  handle({ id, tipo, version, ocurridoEn, correlationId }: EventEnvelope): Promise<void> {
    this.logger.info({ id, tipo, version, ocurridoEn, correlationId }, 'Evento recibido');
    return Promise.resolve();
  }
}
