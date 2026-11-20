# Centro Deportivo Los Robles

Sistema de reservas de canchas y alquiler de implementos deportivos. El Sprint 0 establece el entorno de desarrollo, el esquema de datos, una API de estado, una pantalla de inicio y el consumidor de eventos.

## Requisitos

- Node.js 22 y npm.
- Docker Desktop con Docker Compose v2. Docker Engine con Compose v2 también funciona en Linux.

## Inicio rápido

Copia los valores de desarrollo y levanta el entorno. En PowerShell puedes usar `Copy-Item .env.example .env`.

```sh
cp .env.example .env
docker compose up -d --build
docker compose ps
```

| Servicio          | URL                                   |
| ----------------- | ------------------------------------- |
| Web               | <http://localhost:5173>               |
| API, estado       | <http://localhost:4000/api/v1/health> |
| Swagger           | <http://localhost:4000/api/docs>      |
| RabbitMQ, panel   | <http://localhost:15672>              |
| Mailpit, bandeja  | <http://localhost:8025>               |
| pgAdmin, opcional | <http://localhost:5050>               |

Inicia pgAdmin con `docker compose --profile tools up -d pgadmin`. Usa `db` como host en pgAdmin y las credenciales de `.env`. La API y el worker ejecutan sus migraciones al iniciar. Con `SEED_ON_START=true`, la API también carga los datos de ejemplo.

### Usuarios semilla

| Rol           | Correo                    |
| ------------- | ------------------------- |
| Administrador | `admin@losrobles.test`    |
| Cliente       | `cliente1@losrobles.test` |
| Cliente       | `cliente2@losrobles.test` |

Los tres usan inicialmente el valor local de `SEED_DEFAULT_PASSWORD`. Se guardan hashes bcrypt con coste 12. Volver a ejecutar el seed conserva el hash existente. El inicio de sesión llegará en el Sprint 1.

## Ejecutar las apps directamente con Node.js

1. Copia `.env.example` a `.env`. En `DATABASE_URL` y `NOTIF_DATABASE_URL`, cambia el host `db` por `localhost`. Cambia también `rabbitmq` por `localhost` en `RABBITMQ_URL` y fija `SMTP_HOST=localhost`.
2. Arranca únicamente las dependencias con `docker compose up -d db rabbitmq mailpit`. Si ya tienes PostgreSQL, RabbitMQ y SMTP configurados fuera de Docker, apunta las variables a esas instancias. PostgreSQL debe tener los dos roles y esquemas separados, y la extensión `btree_gist`, según `infra/postgres/init/01-esquemas.sh`.
3. Ejecuta `npm install` y luego `npm run dev`. Vite escucha en el puerto 5173 y envía las rutas que empiezan por `/api` a la API local en el puerto 4000.

Los comandos de desarrollo y de base de datos leen el `.env` de la raíz. El navegador solo recibe las variables de Vite con prefijo `VITE_`.

## Scripts

| Comando                                          | Función                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                                    | Arranca la API, el worker y Vite en modo watch, junto con los contratos compartidos.                               |
| `npm run format` / `npm run format:check`        | Aplica o verifica el formato con Prettier.                                                                         |
| `npm run lint`                                   | Ejecuta ESLint.                                                                                                    |
| `npm run typecheck`                              | Verifica los tipos de todos los workspaces.                                                                        |
| `npm test`                                       | Ejecuta Vitest. La integración PostgreSQL se omite localmente si Docker no está disponible. En CI debe ejecutarse. |
| `npm run build`                                  | Compila los contratos compartidos, la API, el worker y el frontend.                                                |
| `npm run db:migrate` / `npm run db:seed`         | Aplica las migraciones de la API o carga datos de ejemplo.                                                         |
| `npm run db:rollback -w @losrobles/api -- --all` | Revierte todas las migraciones del esquema `core`. Omite `--all` para revertir el último lote.                     |
| `npm run db:make -w @losrobles/api -- nombre`    | Crea una migración TypeScript para la API.                                                                         |

Los hooks ejecutan lint-staged antes del commit y validan los mensajes con Conventional Commits.

## Estructura

| Carpeta               | Contenido                                                         |
| --------------------- | ----------------------------------------------------------------- |
| `apps/api`            | Express, salud, OpenAPI y migraciones y seeds del esquema `core`. |
| `apps/web`            | React, Vite, Tailwind y configuración de nginx.                   |
| `apps/notificaciones` | Consumidor RabbitMQ, adaptador SMTP y migraciones propias.        |
| `packages/shared`     | Esquemas Zod, enumeraciones y contratos HTTP y de eventos.        |
| `infra/postgres/init` | Roles, esquemas y extensión de PostgreSQL.                        |
| `.github/workflows`   | Verificaciones de calidad y compilación de imágenes.              |

Consulta el [diseño del Sprint 0](docs/sprints/sprint-0-diseno.md), la [arquitectura](docs/ARQUITECTURA.md), los [diagramas C4](docs/C4.md) y el [plan de trabajo](docs/SCRUM.md).
