FROM node:22-alpine AS deps
WORKDIR /repo
ENV HUSKY=0
COPY package.json package-lock.json ./
COPY .husky/install.js .husky/
COPY apps/api/package.json apps/api/
COPY apps/notificaciones/package.json apps/notificaciones/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/notificaciones/ apps/notificaciones/
RUN npm run build -w @losrobles/shared && npm run build -w @losrobles/notificaciones

FROM node:22-alpine AS prod-deps
WORKDIR /repo
ENV HUSKY=0
COPY package.json package-lock.json ./
COPY .husky/install.js .husky/
COPY apps/api/package.json apps/api/
COPY apps/notificaciones/package.json apps/notificaciones/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --omit=dev --workspace @losrobles/notificaciones --workspace @losrobles/shared

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=prod-deps --chown=node:node /repo/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /repo/packages/shared ./packages/shared
COPY --from=prod-deps --chown=node:node /repo/apps/notificaciones ./apps/notificaciones
COPY --from=build --chown=node:node /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=node:node /repo/apps/notificaciones/dist ./apps/notificaciones/dist
WORKDIR /repo/apps/notificaciones
USER node
CMD ["node", "dist/main.js"]
