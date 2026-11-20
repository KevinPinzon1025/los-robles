import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import type { AppContainer } from './container.js';
import { openapi } from './docs/openapi.js';
import { healthRoutes } from './modules/health/http/health.routes.js';
import { correlationId, CORRELATION_HEADER } from './shared/http/correlationId.js';
import { errorHandler } from './shared/http/errorHandler.js';
import { notFound } from './shared/http/notFound.js';

export function createApp(container: AppContainer) {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: container.config.CORS_ORIGINS.some((origin) => origin.startsWith('http://'))
          ? { upgradeInsecureRequests: null }
          : {},
      },
    }),
  );
  app.use(cors({ origin: container.config.CORS_ORIGINS, exposedHeaders: [CORRELATION_HEADER] }));
  app.use(express.json({ limit: '100kb' }));
  app.use(correlationId);
  app.use(
    pinoHttp({
      logger: container.logger,
      genReqId: (_req, res) => String(res.getHeader(CORRELATION_HEADER)),
      customAttributeKeys: { reqId: 'correlationId' },
    }),
  );
  app.use('/api/v1', healthRoutes(container));
  if (container.config.ENABLE_DOCS) {
    const document = openapi(container.version);
    app.get('/api/docs/openapi.json', (_req, res) => {
      res.json(document);
    });
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(document));
  }
  app.use(notFound);
  app.use(errorHandler(container.logger));
  return app;
}
