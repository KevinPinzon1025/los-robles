import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { pino } from 'pino';
import { describe, expect, it, vi } from 'vitest';
import { RabbitMqConsumer } from '../src/infrastructure/messaging/RabbitMqConsumer.js';
import { DEAD_LETTER_QUEUE, RETRY_QUEUE } from '../src/infrastructure/messaging/topology.js';

function fixtures() {
  const channel = {
    prefetch: vi.fn<ConfirmChannel['prefetch']>(),
    consume: vi.fn<ConfirmChannel['consume']>(),
    cancel: vi.fn<ConfirmChannel['cancel']>(),
    ack: vi.fn<ConfirmChannel['ack']>(),
    nack: vi.fn<ConfirmChannel['nack']>(),
    sendToQueue: vi.fn<ConfirmChannel['sendToQueue']>((_queue, _content, _options, confirmed) => {
      confirmed?.(null, {});
      return true;
    }),
  };
  const router = { handle: vi.fn().mockResolvedValue(undefined) };
  const consumer = new RabbitMqConsumer(channel, router, pino({ level: 'silent' }));
  return { channel, router, consumer };
}

const envelope = {
  id: '9d724d97-60ca-4ad3-be60-4195ac1b82c0',
  tipo: 'reserva.creada.v1',
  version: 1,
  ocurridoEn: '2026-11-20T12:00:00Z',
  correlationId: 'solicitud-1',
  datos: {},
};

function message(content = JSON.stringify(envelope), attempts?: number): ConsumeMessage {
  return {
    content: Buffer.from(content),
    fields: {
      deliveryTag: 1,
      redelivered: false,
      exchange: 'losrobles.events',
      routingKey: envelope.tipo,
      consumerTag: 'consumer-1',
    },
    properties: {
      contentType: 'application/json',
      contentEncoding: undefined,
      headers: attempts === undefined ? {} : { 'x-intentos': attempts },
      deliveryMode: undefined,
      priority: undefined,
      correlationId: undefined,
      replyTo: undefined,
      expiration: undefined,
      messageId: undefined,
      timestamp: undefined,
      type: undefined,
      userId: undefined,
      appId: undefined,
      clusterId: undefined,
    },
  };
}

describe('RabbitMqConsumer', () => {
  it('confirma un evento procesado', async () => {
    const { channel, router, consumer } = fixtures();
    const received = message();
    await consumer.handle(received);
    expect(router.handle).toHaveBeenCalledWith(envelope);
    expect(channel.ack).toHaveBeenCalledWith(received);
    expect(channel.sendToQueue).not.toHaveBeenCalled();
  });

  it.each([
    [0, RETRY_QUEUE],
    [2, RETRY_QUEUE],
    [3, DEAD_LETTER_QUEUE],
  ] as const)('republica un fallo con %i intentos previos a %s', async (attempts, queue) => {
    const { channel, router, consumer } = fixtures();
    router.handle.mockRejectedValue(new Error('Fallo temporal'));
    const received = message(undefined, attempts);
    await consumer.handle(received);
    expect(channel.sendToQueue).toHaveBeenCalledWith(
      queue,
      received.content,
      expect.objectContaining({
        persistent: true,
        headers: { 'x-intentos': attempts + 1 },
      }),
      expect.any(Function),
    );
    expect(channel.ack).toHaveBeenCalledWith(received);
  });

  it.each(['{', '{}'])('envía mensajes inválidos directamente a la DLQ (%s)', async (content) => {
    const { channel, router, consumer } = fixtures();
    const received = message(content);
    await consumer.handle(received);
    expect(router.handle).not.toHaveBeenCalled();
    expect(channel.sendToQueue).toHaveBeenCalledWith(
      DEAD_LETTER_QUEUE,
      received.content,
      expect.any(Object),
      expect.any(Function),
    );
    expect(channel.ack).toHaveBeenCalledWith(received);
  });

  it('solicita reentrega si RabbitMQ rechaza la republicación', async () => {
    const { channel, router, consumer } = fixtures();
    router.handle.mockRejectedValue(new Error('Fallo temporal'));
    channel.sendToQueue.mockImplementation((_queue, _content, _options, confirmed) => {
      confirmed?.(new Error('Publicación rechazada'), {});
      return true;
    });
    const received = message();
    await consumer.handle(received);
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(received, false, true);
  });
});
