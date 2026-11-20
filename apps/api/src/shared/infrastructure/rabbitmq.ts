import { connect } from 'amqplib';
import type { ChannelModel } from 'amqplib';
import { EVENT_EXCHANGE } from '@losrobles/shared';
import type { Logger } from 'pino';

export function createRabbit(url: string, logger: Logger) {
  let connection: ChannelModel | undefined;
  let pending: Promise<void> | undefined;
  let timer: NodeJS.Timeout | undefined;
  let stopped = false;
  let attempts = 0;
  const endpoint = new URL(url);
  if (!endpoint.searchParams.has('heartbeat')) endpoint.searchParams.set('heartbeat', '10');

  function retry() {
    if (stopped || timer) return;
    const delay = Math.min(1000 * 2 ** attempts++, 30000);
    timer = setTimeout(() => {
      timer = undefined;
      start();
    }, delay);
    timer.unref();
  }

  async function open() {
    let candidate: ChannelModel | undefined;
    try {
      candidate = await connect(endpoint.href, { timeout: 5000 });
      const active = candidate;
      active.on('error', (err: unknown) => logger.warn({ err }, 'Error de conexión a RabbitMQ'));
      active.once('close', () => {
        if (connection === active) connection = undefined;
        retry();
      });
      if (stopped) {
        await active.close();
        return;
      }
      const channel = await active.createChannel();
      channel.on('error', (err: unknown) => logger.warn({ err }, 'Error en el canal de RabbitMQ'));
      await channel.assertExchange(EVENT_EXCHANGE, 'topic', { durable: true });
      await channel.close();
      if (stopped) {
        await active.close();
        return;
      }
      connection = active;
      attempts = 0;
      logger.info('Conexión de la API a RabbitMQ establecida');
    } catch (err) {
      logger.warn({ err }, 'RabbitMQ no está disponible');
      await candidate?.close().catch(() => undefined);
      retry();
    }
  }

  function start() {
    if (stopped || pending || connection) return;
    pending = open().finally(() => {
      pending = undefined;
    });
  }

  return {
    start,
    checkRabbit: () => Promise.resolve(connection !== undefined),
    async close() {
      stopped = true;
      clearTimeout(timer);
      await pending;
      await connection?.close().catch(() => undefined);
    },
  };
}
