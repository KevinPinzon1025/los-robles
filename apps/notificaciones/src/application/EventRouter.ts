import type { EventEnvelope } from '@losrobles/shared';
import type { EventHandler } from './ports.js';

interface RouterLog {
  warn(context: { tipo: string; correlationId: string }, message: string): void;
}

export class EventRouter implements EventHandler {
  constructor(
    private readonly handlers: ReadonlyMap<string, EventHandler>,
    private readonly logger: RouterLog,
  ) {}

  async handle(event: EventEnvelope): Promise<void> {
    const handler = this.handlers.get(event.tipo);
    if (!handler) {
      this.logger.warn(
        { tipo: event.tipo, correlationId: event.correlationId },
        'Evento sin handler registrado',
      );
      return;
    }
    await handler.handle(event);
  }
}
