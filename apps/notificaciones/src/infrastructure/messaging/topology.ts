import { EVENT_EXCHANGE } from '@losrobles/shared';
import type { Channel } from 'amqplib';

export const EVENT_QUEUE = 'notificaciones.eventos';
export const RETRY_QUEUE = `${EVENT_QUEUE}.retry`;
export const DEAD_LETTER_QUEUE = `${EVENT_QUEUE}.dlq`;
export const RETRY_TTL_MS = 10000;

export async function declareTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(EVENT_EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(EVENT_QUEUE, {
    durable: true,
    arguments: { 'x-queue-type': 'quorum' },
  });
  await channel.assertQueue(RETRY_QUEUE, {
    durable: true,
    messageTtl: RETRY_TTL_MS,
    deadLetterExchange: '',
    deadLetterRoutingKey: EVENT_QUEUE,
  });
  await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
  for (const key of ['usuario.#', 'reserva.#', 'alquiler.#']) {
    await channel.bindQueue(EVENT_QUEUE, EVENT_EXCHANGE, key);
  }
}
