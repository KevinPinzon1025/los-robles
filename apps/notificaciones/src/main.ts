import { connect } from 'amqplib';
import type { ChannelModel } from 'amqplib';
import { EventTypes } from '@losrobles/shared';
import { EventRouter } from './application/EventRouter.js';
import { loadEnv } from './config/env.js';
import { LogEventHandler } from './handlers/LogEventHandler.js';
import { createDatabase } from './infrastructure/database.js';
import { createLogger } from './infrastructure/logger.js';
import { SmtpMailer } from './infrastructure/mail/SmtpMailer.js';
import { RabbitMqConsumer } from './infrastructure/messaging/RabbitMqConsumer.js';
import { declareTopology } from './infrastructure/messaging/topology.js';

async function main() {
  const config = loadEnv();
  const logger = createLogger(config);
  const database = createDatabase(config.NOTIF_DATABASE_URL);
  const mailer = new SmtpMailer(config.SMTP_HOST, config.SMTP_PORT, config.MAIL_FROM);
  let connection: ChannelModel | undefined;
  let consumer: RabbitMqConsumer | undefined;
  let closing: Promise<void> | undefined;

  function shutdown(reason: string, unexpected = false): Promise<void> {
    if (closing) return closing;
    logger.info({ reason }, 'Apagando el servicio de notificaciones');
    if (unexpected) process.exitCode = 1;
    closing = Promise.resolve()
      .then(async () => {
        try {
          await consumer?.stop();
        } finally {
          await Promise.allSettled([connection?.close(), database.destroy()]);
          mailer.close();
        }
      })
      .catch((err: unknown) => {
        logger.warn({ err }, 'No se pudo finalizar el consumidor de forma ordenada');
        process.exitCode = 1;
      });
    return closing;
  }

  try {
    await database.migrate.latest();
    await mailer.verify();
    logger.info('Conexión SMTP verificada');
    const url = new URL(config.RABBITMQ_URL);
    if (!url.searchParams.has('heartbeat')) url.searchParams.set('heartbeat', '10');
    connection = await connect(url.href, { timeout: 5000 });
    connection.on('error', (err: unknown) =>
      logger.error({ err }, 'Error en la conexión a RabbitMQ'),
    );
    connection.once('close', () => {
      if (!closing) void shutdown('Conexión AMQP cerrada', true);
    });

    const channel = await connection.createConfirmChannel();
    channel.on('error', (err: unknown) =>
      logger.error({ err }, 'Error en el canal de notificaciones'),
    );
    channel.once('close', () => {
      if (!closing) void shutdown('Canal AMQP cerrado', true);
    });
    await declareTopology(channel);
    const handler = new LogEventHandler(logger);
    const router = new EventRouter(new Map(EventTypes.map((tipo) => [tipo, handler])), logger);
    consumer = new RabbitMqConsumer(channel, router, logger);
    await consumer.start(config.PREFETCH, () => {
      void shutdown('Consumidor cancelado por RabbitMQ', true);
    });
    logger.info({ prefetch: config.PREFETCH }, 'Servicio de notificaciones en escucha');

    process.once('SIGINT', () => {
      void shutdown('SIGINT');
    });
    process.once('SIGTERM', () => {
      void shutdown('SIGTERM');
    });
  } catch (err) {
    await shutdown('Fallo de inicio', true);
    throw err;
  }
}

void main().catch((err: unknown) => {
  createLogger().fatal({ err }, 'No se pudo iniciar el servicio de notificaciones');
  process.exitCode = 1;
});
