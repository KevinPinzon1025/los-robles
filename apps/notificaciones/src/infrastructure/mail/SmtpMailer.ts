import nodemailer from 'nodemailer';
import type { Mailer, MailMessage } from '../../application/ports.js';

export class SmtpMailer implements Mailer {
  private readonly transport;

  constructor(
    host: string,
    port: number,
    private readonly from: string,
  ) {
    this.transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
  }

  async verify(): Promise<void> {
    await this.transport.verify();
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({ ...message, from: this.from });
  }

  close(): void {
    this.transport.close();
  }
}
