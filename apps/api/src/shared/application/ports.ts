import type { EventEnvelope } from '@losrobles/shared';

export interface Clock {
  now(): Date;
}

export interface UnitOfWork<Context> {
  run<T>(operation: (context: Context) => Promise<T>): Promise<T>;
}

export interface EventPublisher {
  publish(event: EventEnvelope): Promise<void>;
}
