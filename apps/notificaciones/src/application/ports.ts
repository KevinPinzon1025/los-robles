import type { EventEnvelope } from '@losrobles/shared';

export interface EventHandler {
  handle(event: EventEnvelope): Promise<void>;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export interface MensajesProcesadosRepository {
  existe(idMensaje: string): Promise<boolean>;
  registrar(idMensaje: string, tipo: string): Promise<void>;
}
