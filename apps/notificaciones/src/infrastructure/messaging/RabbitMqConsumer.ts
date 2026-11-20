import { EventEnvelopeSchema } from '@losrobles/shared';
import type { ConsumeMessage, ConfirmChannel } from 'amqplib';
import type { Logger } from 'pino';
import type { EventHandler } from '../../application/ports.js';
import { DEAD_LETTER_QUEUE, EVENT_QUEUE, RETRY_QUEUE } from './topology.js';

const MAX_INTENTOS = 3;
const ATTEMPTS_HEADER = 'x-intentos';

type ConsumerChannel = Pick<
  ConfirmChannel,
  'prefetch' | 'consume' | 'cancel' | 'ack' | 'nack' | 'sendToQueue'
>;

function parseEvent(content: Buffer) {
  let json: unknown;
  try {
    json = JSON.parse(content.toString('utf8'));
  } catch {
    return undefined;
  }
  return EventEnvelopeSchema.safeParse(json).data;
}

export class RabbitMqConsumer {
  private consumerTag?: string;
  private readonly inFlight = new Set<Promise<void>>();

  constructor(
    private readonly channel: ConsumerChannel,
    private readonly router: EventHandler,
    private readonly logger: Logger,
  ) {}

  async start(prefetch: number, onCancelled: () => void): Promise<void> {
    await this.channel.prefetch(prefetch);
    const { consumerTag } = await this.channel.consume(
      EVENT_QUEUE,
      (message) => {
        if (!message) {
          onCancelled();
          return;
        }
        const handling = this.handle(message).finally(() => this.inFlight.delete(handling));
        this.inFlight.add(handling);
      },
      { noAck: false },
    );
    this.consumerTag = consumerTag;
  }

  async stop(): Promise<void> {
    try {
      if (this.consumerTag) await this.channel.cancel(this.consumerTag);
    } finally {
      await Promise.all(this.inFlight);
    }
  }

  async handle(message: ConsumeMessage): Promise<void> {
    try {
      const event = parseEvent(message.content);
      if (!event) {
        this.logger.warn(
          { routingKey: message.fields.routingKey },
          'Evento inválido enviado a la DLQ',
        );
        await this.forward(message, DEAD_LETTER_QUEUE);
      } else {
        try {
          await this.router.handle(event);
        } catch (err) {
          const count: unknown = message.properties.headers?.[ATTEMPTS_HEADER];
          const previous =
            typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? count : 0;
          const target = previous >= MAX_INTENTOS ? DEAD_LETTER_QUEUE : RETRY_QUEUE;
          this.logger.warn(
            { err, correlationId: event.correlationId, intentos: previous + 1, target },
            'Falló el procesamiento del evento',
          );
          await this.forward(message, target, previous + 1);
        }
      }
      this.channel.ack(message);
    } catch (err) {
      this.logger.error({ err }, 'No se pudo confirmar el mensaje; se solicitará la reentrega');
      try {
        this.channel.nack(message, false, true);
      } catch (nackError) {
        this.logger.debug({ err: nackError }, 'El broker recuperará el mensaje al cerrar el canal');
      }
    }
  }

  private forward(message: ConsumeMessage, queue: string, attempts?: number): Promise<void> {
    const { contentType, contentEncoding, correlationId, messageId, headers } = message.properties;
    return new Promise<void>((resolve, reject) => {
      this.channel.sendToQueue(
        queue,
        message.content,
        {
          persistent: true,
          contentType,
          contentEncoding,
          correlationId,
          messageId,
          headers: attempts === undefined ? headers : { ...headers, [ATTEMPTS_HEADER]: attempts },
        },
        (err: unknown) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }
}
