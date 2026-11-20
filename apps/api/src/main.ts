import { once } from 'node:events';
import { createApp } from './app.js';
import { createContainer } from './container.js';
import { createLogger } from './shared/infrastructure/logger.js';

async function main() {
  const container = await createContainer();
  const { config, logger } = container;

  try {
    const server = createApp(container).listen(config.API_PORT, '0.0.0.0');
    await once(server, 'listening');
    container.rabbit.start();
    logger.info({ port: config.API_PORT }, 'API en escucha');
    logger.debug('El relay del outbox está inactivo en Sprint 0');

    let closing = false;
    const shutdown = (signal: NodeJS.Signals) => {
      if (closing) return;
      closing = true;
      logger.info({ signal }, 'Apagando la API');

      const deadline = setTimeout(() => server.closeAllConnections(), 10000);
      deadline.unref();
      server.close((err) => {
        clearTimeout(deadline);
        void container.close().catch((closeError: unknown) => {
          logger.error({ err: closeError }, 'Error al cerrar las dependencias de la API');
          process.exitCode = 1;
        });
        if (err) {
          logger.error({ err }, 'Error al cerrar la API');
          process.exitCode = 1;
        }
      });
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  } catch (err) {
    await container.close();
    throw err;
  }
}

void main().catch((err: unknown) => {
  createLogger().fatal({ err }, 'No se pudo iniciar la API');
  process.exitCode = 1;
});
