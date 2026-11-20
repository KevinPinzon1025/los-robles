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
ARG VITE_API_BASE=/api/v1
ENV VITE_API_BASE=$VITE_API_BASE
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/
RUN npm run build -w @losrobles/shared && npm run build -w @losrobles/web

FROM nginx:1.30.7-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist/ /usr/share/nginx/html/
