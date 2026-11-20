# Sprint 0 — Diseño técnico (HU-00 … HU-05)

> **Sprint Goal:** "El entorno completo se levanta con `docker compose up` y el CI está en verde".
> Autor del diseño: Claude (arquitecto). Implementación: Codex. Referencias: [ARQUITECTURA.md](../ARQUITECTURA.md), [C4.md](../C4.md).
> Este documento es la **especificación** que se implementa. Si algo aquí contradice ARQUITECTURA.md, manda este documento (y se actualiza ARQUITECTURA.md en el mismo PR).

---

## 0. Reglas generales
- **Lenguaje:** TypeScript estricto (`"strict": true`, `noUncheckedIndexedAccess: true`) en todo el monorepo. Prohibido `any` explícito (regla ESLint en `error`).
- **Módulos:** ESM en todo (`"type": "module"`), `moduleResolution: "NodeNext"` en backend, `"Bundler"` en web.
- **Node:** `>=22` (`engines` + `.nvmrc` con `22`). Imágenes Docker `node:22-alpine`.
- **Idioma:** nombres de dominio en español (Reserva, Cancha, Disciplina); infraestructura técnica en inglés cuando es convención (`errorHandler`, `httpClient`). Mensajes al usuario en español.
- **Versiones:** usar las últimas versiones estables de cada dependencia y fijarlas con `package-lock.json`. No usar paquetes deprecados.
- **Sin secretos en el repo.** Solo `.env.example`.
- No crear lógica de negocio de sprints futuros (auth, reservas, etc.). Sí crear el **modelo de datos completo** (HU-02) porque ya está diseñado.

---

## 1. HU-00 — Monorepo, calidad y CI (5 pts)

### Estructura
```
/
├─ apps/
│  ├─ api/                  @losrobles/api
│  ├─ web/                  @losrobles/web
│  └─ notificaciones/       @losrobles/notificaciones
├─ packages/
│  └─ shared/               @losrobles/shared
├─ infra/postgres/init/     scripts de inicialización del contenedor db
├─ docs/
├─ .github/workflows/ci.yml
├─ docker-compose.yml
├─ .env.example
├─ .nvmrc  .editorconfig  .prettierrc.json  .prettierignore
├─ eslint.config.js          (flat config, raíz, para todos los workspaces)
├─ commitlint.config.js
├─ tsconfig.base.json
└─ package.json              (npm workspaces: ["apps/*", "packages/*"])
```

### package.json raíz — scripts obligatorios
| Script | Qué hace |
|---|---|
| `lint` | `eslint .` |
| `format` / `format:check` | Prettier escribir / verificar |
| `typecheck` | `tsc --noEmit` en cada workspace (`npm run typecheck --workspaces --if-present`) |
| `test` | Vitest en cada workspace (`--workspaces --if-present`) |
| `build` | Compila `shared` primero y luego el resto |
| `dev` | Levanta api, notificaciones y web en modo watch (usar `concurrently` o `npm run dev --workspaces` en paralelo). Requiere db/rabbit en Docker |
| `db:migrate` / `db:seed` | Delegan a `@losrobles/api` |
| `prepare` | `husky` |

### Calidad
- **ESLint 9 flat config** con `@eslint/js`, `typescript-eslint` (recommended + `no-explicit-any: error`), `eslint-plugin-react-hooks` y `eslint-plugin-react-refresh` solo para `apps/web`. Ignorar `dist`, `coverage`, `node_modules`.
- **Prettier:** `singleQuote: true`, `semi: true`, `printWidth: 100`, `trailingComma: "all"`.
- **Husky:** `pre-commit` → `lint-staged` (eslint --fix + prettier en archivos staged); `commit-msg` → `commitlint` con `@commitlint/config-conventional`.
- **`.editorconfig`** con `end_of_line = lf` y **`.gitattributes`** con `* text=auto eol=lf`.

### `packages/shared`
- Compila a `dist/` con `tsc` (ESM + `.d.ts`). `exports` en package.json apuntando a `dist`.
- Contenido inicial:
  - `enums.ts`: `Rol` (`CLIENTE`, `ADMIN`), `EstadoUsuario`, `EstadoCancha` (`ACTIVA`, `INACTIVA`, `MANTENIMIENTO`), `EstadoReserva` (`PROGRAMADA`, `CANCELADA`, `CUMPLIDA`), `TipoReserva` (`CLIENTE`, `TERCERO`), `EstadoAlquiler`. Como `z.enum` + tipo inferido.
  - `http.ts`: `ErrorResponseSchema` → `{ error: { code: string, message: string, details?: unknown[] } }`; `HealthResponseSchema` → `{ status: 'ok' | 'degraded', version: string, uptimeSeg: number, dependencias: { db: 'up' | 'down', rabbitmq: 'up' | 'down' } }`.
  - `events/`:
    - `EVENT_EXCHANGE = 'losrobles.events'`
    - `EventTypes` = `usuario.registrado.v1`, `reserva.creada.v1`, `reserva.cancelada.v1`, `reserva.recordatorio.v1`, `alquiler.vencido.v1`
    - `EventEnvelopeSchema` = `{ id: uuid, tipo: string, version: number int ≥1, ocurridoEn: ISO datetime, correlationId: string, datos: unknown }`
    - Esquema Zod de `datos` para cada evento (según tabla "Eventos publicados" de ARQUITECTURA.md §4).
  - `index.ts` que reexporta todo.
- Pruebas Vitest: envelope válido/ inválido, un evento de cada tipo valida.

### CI — `.github/workflows/ci.yml`
- Disparadores: `pull_request` hacia `develop` y `main`; `push` a `develop` y `main`.
- Job `calidad` (ubuntu-latest, Node 22 con caché npm): `npm ci` → `npm run format:check` → `npm run lint` → `npm run build -w @losrobles/shared` → `npm run typecheck` → `npm test` → `npm run build`.
- Job `docker` (needs: calidad): `docker compose build` (verifica que las 3 imágenes compilan) usando `.env.example` copiado a `.env`.
- `concurrency` para cancelar ejecuciones viejas del mismo PR.

**Criterios de aceptación**
- [ ] `npm ci && npm run lint && npm run typecheck && npm test && npm run build` pasa desde un clon limpio.
- [ ] Un commit con mensaje "cambios" es rechazado por commitlint; `feat(api): algo` es aceptado.
- [ ] El workflow de CI pasa en el PR.

---

## 2. HU-01 — Docker Compose (3 pts)

### `docker-compose.yml` (nombre del proyecto: `losrobles`, red `losrobles-net`)

| Servicio | Imagen / build | Puertos host | Healthcheck | Notas |
|---|---|---|---|---|
| `db` | `postgres:17-alpine` | `5432` | `pg_isready -U $POSTGRES_USER` | Volumen `pgdata`; monta `infra/postgres/init` en `/docker-entrypoint-initdb.d` |
| `rabbitmq` | `rabbitmq:4-management-alpine` | `5672`, `15672` | `rabbitmq-diagnostics -q ping` | Usuario/clave por env (`RABBITMQ_DEFAULT_USER/PASS`), volumen `rabbitdata` |
| `mailpit` | `axllent/mailpit` (versión fija) | `1025`, `8025` | — | SMTP falso |
| `api` | build `apps/api/Dockerfile` (contexto raíz) | `4000` | `wget -qO- http://localhost:4000/api/v1/health` | `depends_on` db y rabbitmq `service_healthy`; corre migraciones al iniciar (y seeds si `SEED_ON_START=true`) |
| `notificaciones` | build `apps/notificaciones/Dockerfile` (contexto raíz) | — | — | `depends_on` db y rabbitmq `service_healthy`; corre sus migraciones al iniciar |
| `web` | build `apps/web/Dockerfile` (contexto raíz) | `5173:80` | — | nginx sirve el build y hace proxy `/api` → `http://api:4000` |
| `pgadmin` | `dpage/pgadmin4` | `5050` | — | `profiles: ["tools"]` (solo con `docker compose --profile tools up`) |

- Todas las imágenes de terceros con **tag de versión fijo** (no `latest`).
- `restart: unless-stopped` en api y notificaciones.
- Variables desde `.env` (ver §7).

### `infra/postgres/init/01-esquemas.sh`
Script bash (usa variables de entorno, sin contraseñas escritas en el archivo) que en el primer arranque:
1. Crea los roles `$CORE_DB_USER` y `$NOTIF_DB_USER` con sus contraseñas.
2. Crea los esquemas `core` (dueño `$CORE_DB_USER`) y `notificaciones` (dueño `$NOTIF_DB_USER`).
3. Revoca `CREATE` en `public` a `PUBLIC`; cada rol tiene `search_path` a su propio esquema.
4. Crea la extensión `btree_gist` (requerida por la restricción de reservas) — como superusuario, en el esquema `public`.
5. Garantiza que **ningún rol puede leer el esquema del otro**.

### Dockerfiles (api, notificaciones, web)
- **Multi-stage**: `deps` (npm ci con workspaces) → `build` (compila shared + la app) → `runtime`.
- Runtime de api/notificaciones: `node:22-alpine`, solo `dist/` + dependencias de producción, `USER node`, `NODE_ENV=production`, `CMD ["node", "dist/main.js"]`.
- Runtime de web: `nginx:alpine` con `nginx.conf` propio: SPA fallback (`try_files $uri /index.html`), proxy `/api/` → `http://api:4000`, cache largo para `/assets/`.
- `.dockerignore` en la raíz (node_modules, dist, .git, .env, coverage).

**Criterios de aceptación**
- [ ] Con `cp .env.example .env` y `docker compose up -d --build`, todos los servicios quedan `running` y db, rabbitmq y api `healthy` en < 2 min.
- [ ] `docker compose down -v && docker compose up -d` vuelve a dejar todo funcionando desde cero.
- [ ] El rol de la API no puede hacer `SELECT` sobre `notificaciones.*` y viceversa (probado con psql).

---

## 3. HU-02 — Base de datos: migraciones y seeds (5 pts)

### Herramienta
- **Knex** con driver `pg`. Migraciones en **TypeScript** dentro de `apps/api/src/db/migrations/` (se compilan con el resto; en runtime se cargan de `dist/db/migrations`, con `loadExtensions: ['.js']` en producción y `['.ts']` en dev con `tsx`).
- `apps/api/src/db/knex.ts`: fábrica del cliente Knex (pool `min 0, max 10`), `searchPath: ['core']`.
- Scripts del workspace api: `db:migrate`, `db:rollback`, `db:seed`, `db:make <nombre>`.
- La API ejecuta `migrate.latest()` al arrancar (y `seed.run()` si `SEED_ON_START=true`).

### Esquema `core` (una migración por tabla o agrupadas por módulo, en este orden)
Todas las tablas con `id ... GENERATED ALWAYS AS IDENTITY`, `creado_en timestamptz not null default now()` y `actualizado_en timestamptz not null default now()` (trigger `set_actualizado_en`).

1. **usuario**: `id_usuario`, `primer_nombre varchar(50) not null`, `segundo_nombre varchar(50)`, `primer_apellido varchar(50) not null`, `segundo_apellido varchar(50)`, `correo varchar(120) not null`, `contrasena_hash varchar(100) not null`, `rol varchar(10) not null check in ('CLIENTE','ADMIN')`, `estado varchar(10) not null default 'ACTIVO' check in ('ACTIVO','INACTIVO')`. Índice único `lower(correo)`.
2. **cliente**: `id_usuario` PK + FK → usuario on delete cascade, `celular varchar(10) not null check (celular ~ '^3[0-9]{9}$')`.
3. **administrador**: `id_usuario` PK + FK → usuario on delete cascade, `fecha_inicio date not null default current_date`.
4. **disciplina**: `id_disciplina`, `nombre varchar(50) not null unique`, `descripcion varchar(500) not null`.
5. **cancha**: `id_cancha`, `id_disciplina` FK, `nombre varchar(50) not null unique`, `estado varchar(15) not null default 'ACTIVA' check in (...)`, `hora_apertura time not null`, `hora_cierre time not null`, `valor_hora numeric(10,0) not null check (> 0)`, `check (hora_apertura < hora_cierre)`.
6. **reserva**: `id_reserva`, `id_cancha` FK, `tipo varchar(10) check in ('CLIENTE','TERCERO')`, `id_cliente` FK → cliente nullable, `nombre_tercero varchar(100)`, `contacto_tercero varchar(20)`, `creada_por` FK → usuario not null, `inicio timestamptz not null`, `fin timestamptz not null`, `valor numeric(10,0) not null`, `estado varchar(10) not null default 'PROGRAMADA' check in (...)`, `motivo_cancelacion varchar(200)`.
   - `check (fin > inicio)`
   - `check ((tipo='CLIENTE' and id_cliente is not null and nombre_tercero is null) or (tipo='TERCERO' and id_cliente is null and nombre_tercero is not null and contacto_tercero is not null))`
   - **`EXCLUDE USING gist (id_cancha WITH =, tstzrange(inicio, fin, '[)') WITH &&) WHERE (estado = 'PROGRAMADA')`** con nombre `reserva_sin_solapamiento`.
   - Índices: `(id_cliente, inicio)`, `(id_cancha, inicio)`.
7. **implemento**: `id_implemento`, `id_disciplina` FK nullable, `nombre varchar(80) not null unique`, `stock_total int not null check (>= 0)`, `estado varchar(15) check in ('DISPONIBLE','NO_DISPONIBLE')`.
8. **alquiler**: `id_alquiler`, `id_cliente` FK, `id_implemento` FK, `cantidad int check (> 0)`, `fecha_prestamo timestamptz not null default now()`, `fecha_limite timestamptz not null`, `fecha_devolucion timestamptz`, `estado varchar(10) check in ('ACTIVO','DEVUELTO','VENCIDO')`.
9. **outbox**: `id uuid primary key`, `tipo varchar(60) not null`, `payload jsonb not null`, `creado_en timestamptz default now()`, `publicado_en timestamptz`, `intentos int not null default 0`. Índice parcial `(creado_en) where publicado_en is null`.

### Seeds (`apps/api/src/db/seeds/`) — idempotentes (upsert por clave natural)
- 4 disciplinas: Fútbol, Baloncesto, Voleibol, Tenis (descripciones del repo original).
- 4 canchas (una por disciplina), 06:00–22:00, valores 80 000 / 60 000 / 50 000 / 70 000.
- 5 implementos (balón de fútbol N°5, balón de baloncesto, red de voleibol, raqueta de tenis, conos).
- 1 admin (`admin@losrobles.test`) y 2 clientes (`cliente1@losrobles.test`, `cliente2@losrobles.test`). Contraseña tomada de `SEED_DEFAULT_PASSWORD` (env), **hasheada con bcrypt cost 12**. Si la variable no existe, el seed falla con un mensaje claro.

### Pruebas (integración, Vitest + Testcontainers `@testcontainers/postgresql`)
- Migraciones suben y bajan (`latest` → `rollback --all`) sin error.
- **Dos reservas PROGRAMADAS que se cruzan en la misma cancha → error `23P01` (exclusion_violation)**; si una está CANCELADA, la segunda entra.
- Una reserva TERCERO sin `nombre_tercero` → violación de check.
- Seeds corridos dos veces no duplican filas.
- Si Docker no está disponible, estas pruebas se marcan `skip` con aviso (no rompen `npm test` local); en CI corren siempre.

**Criterios de aceptación**
- [ ] Tras `docker compose up`, `core` tiene las 9 tablas y los seeds.
- [ ] La restricción de no solapamiento está probada.
- [ ] Las contraseñas en BD son hashes bcrypt.

---

## 4. HU-03 — Base de la API (3 pts)

### Estructura (`apps/api/src/`)
```
main.ts                     arranque: config → migraciones → container → app.listen → relay(no-op) ; apagado ordenado (SIGTERM/SIGINT)
app.ts                      createApp(container): Express configurado (testeable con supertest, sin listen)
container.ts                Composition Root: crea config, logger, knex, rabbit, repos y casos de uso
config/env.ts               esquema Zod de variables; falla al arrancar si falta alguna, mostrando cuáles
shared/
  domain/                   DomainError (code, message, details), NotFoundError, ConflictError, ValidationError, UnauthorizedError, ForbiddenError, BusinessRuleError
  application/              puertos: Clock, UnitOfWork, EventPublisher (solo interfaces)
  infrastructure/
    logger.ts               pino (pretty en dev, JSON en prod)
    database.ts             singleton del cliente Knex + checkDb()
    rabbitmq.ts             singleton de conexión AMQP (amqplib) con reconexión exponencial; assertExchange(EVENT_EXCHANGE, 'topic', durable); checkRabbit()
    systemClock.ts
  http/
    errorHandler.ts         DomainError → status + ErrorResponse; ZodError → 400; desconocido → 500 sin filtrar detalles
    notFound.ts             404 con ErrorResponse
    validate.ts             validate({ body?, query?, params? }) con esquemas Zod
    correlationId.ts        lee/crea header `x-correlation-id`, lo pone en logs y respuesta
    asyncHandler.ts         (si hace falta con Express 5, si no omitir)
modules/
  health/
    http/health.routes.ts   GET /api/v1/health
db/                         knex.ts, migrations/, seeds/
docs/openapi.ts             documento OpenAPI 3.1 (objeto TS) con /health y el esquema de error
```
- Middlewares globales en este orden: `helmet` → `cors` (orígenes de `CORS_ORIGINS`) → `express.json({ limit: '100kb' })` → `correlationId` → `pino-http` → rutas → `notFound` → `errorHandler`.
- **`GET /api/v1/health`** → 200 con `HealthResponse` (`status: 'ok'` si db y rabbit up; `'degraded'` con 503 si alguno cae). No requiere auth.
- **Swagger UI** en `/api/docs` (`swagger-ui-express`) y JSON en `/api/docs/openapi.json`. Deshabilitable con `ENABLE_DOCS=false`.
- **Mapa de errores:** Validation 400 · Unauthorized 401 · Forbidden 403 · NotFound 404 · Conflict 409 · BusinessRule 422 · otro 500.

### Pruebas
- Unitarias: errorHandler (cada tipo de error → status y cuerpo correctos), validate, config/env (falta variable → error claro).
- Integración (supertest con dependencias falsas en el container): `/api/v1/health` 200 y 503; ruta inexistente → 404 con formato de error; `x-correlation-id` vuelve en la respuesta.

**Criterios de aceptación**
- [ ] `GET http://localhost:4000/api/v1/health` → 200 `{ status: 'ok', dependencias: { db: 'up', rabbitmq: 'up' } ... }`.
- [ ] `http://localhost:4000/api/docs` muestra Swagger.
- [ ] Todo error sale con el formato `{ error: { code, message } }`.

---

## 5. HU-04 — Base del frontend (3 pts)

### Stack
Vite + React 19 + TypeScript, **Tailwind CSS v4** (`@tailwindcss/vite`), React Router 7 (`createBrowserRouter`), TanStack Query 5, Vitest + Testing Library + jsdom.

### Estructura (`apps/web/src/`)
```
main.tsx
app/
  router.tsx                rutas: "/" Inicio, "*" NoEncontrado (las de auth/cliente/admin llegan en Sprint 1)
  providers.tsx             QueryClientProvider (+ espacio para AuthProvider)
  layout/AppLayout.tsx      header verde con logo/nombre "Centro Deportivo Los Robles", <Outlet/>, footer
features/
  inicio/pages/InicioPage.tsx   hero "Reserva tu cancha" + botones "Iniciar sesión" / "Crear cuenta" (deshabilitados con tooltip "Próximamente") + indicador del estado de la API
  sistema/api.ts             getHealth() usando httpClient
  sistema/useHealth.ts       hook TanStack Query
shared/
  api/httpClient.ts          fetch wrapper: base `VITE_API_BASE` (default `/api/v1`), JSON, header `x-correlation-id`, lanza `ApiError(status, code, message)` parseando ErrorResponse; punto de extensión para token (getToken) que se usa en Sprint 1
  components/ui/            Button (variantes primary/secondary/ghost, tamaño, loading), Input (label + error), Card, Spinner, Badge
  lib/cn.ts                 utilidad para clases
styles/index.css            @import "tailwindcss"; tema con colores de marca (verde esmeralda como el original) vía @theme
```
- **Dev:** `vite.config.ts` con proxy `/api` → `http://localhost:4000`.
- **Assets:** copiar del repo original solo `logo.png` (opcional: si no está disponible, usar un ícono SVG simple). No usar imágenes con marca de agua de bancos de imágenes.
- **Accesibilidad:** botones con `aria-label` cuando sean solo ícono; contraste AA.

### Pruebas
- `InicioPage` renderiza el título y muestra "API en línea" cuando `getHealth` responde ok (mock) y "API no disponible" si falla.
- `httpClient` convierte un `ErrorResponse` en `ApiError` con code y message.
- `Button` muestra spinner y queda deshabilitado con `loading`.

**Criterios de aceptación**
- [ ] `http://localhost:5173` (Docker) muestra la página de inicio con el indicador "API en línea".
- [ ] Recargar `http://localhost:5173/cualquier-ruta` muestra la página 404 de la app (no la de nginx).
- [ ] `npm run dev -w @losrobles/web` funciona con la API corriendo en local.

---

## 6. HU-05 — Base del servicio de notificaciones (3 pts)

### Estructura (`apps/notificaciones/src/`)
```
main.ts                     config → migraciones propias → conexión rabbit → registrar consumidor → apagado ordenado
config/env.ts               Zod (RABBITMQ_URL, NOTIF_DATABASE_URL, SMTP_HOST, SMTP_PORT, MAIL_FROM, LOG_LEVEL, PREFETCH)
infrastructure/
  logger.ts                 pino
  database.ts               Knex, searchPath ['notificaciones']
  messaging/topology.ts     declara la topología (idempotente) — ver abajo
  messaging/RabbitMqConsumer.ts  consume con prefetch, valida EventEnvelope (shared), delega al EventRouter, ack si ok; si falla: publica a cola retry con header `x-intentos`+1; si intentos > MAX_INTENTOS (3) → DLQ; mensaje inválido → DLQ directo
  mail/SmtpMailer.ts        adapter Nodemailer (puerto `Mailer` en application/); en este sprint solo se instancia y se verifica conexión
application/
  EventRouter.ts            Map<tipo, EventHandler>; tipo sin handler → log warn + ack
  ports.ts                  EventHandler, Mailer, MensajesProcesadosRepository
handlers/
  LogEventHandler.ts        handler temporal: registra en log el evento (los handlers reales llegan en Sprint 5)
db/migrations/              tablas del esquema notificaciones
```

### Topología RabbitMQ (la declara el código; reemplaza a `infra/rabbitmq/definitions.json` de ARQUITECTURA.md — actualizar ese documento)
- Exchange `losrobles.events` (topic, durable) — **también lo declara la API** (el que publica).
- Cola `notificaciones.eventos` (durable, quorum) con bindings `usuario.#`, `reserva.#`, `alquiler.#`.
- Cola `notificaciones.eventos.retry` (durable) con `x-message-ttl` = 10 000 ms y `x-dead-letter-exchange` = `''` + `x-dead-letter-routing-key` = `notificaciones.eventos` (al vencer vuelve a la cola principal).
- Cola `notificaciones.eventos.dlq` (durable).

### Esquema `notificaciones`
- **mensaje_procesado**: `id_mensaje uuid primary key`, `tipo varchar(60) not null`, `procesado_en timestamptz not null default now()`.
- **notificacion**: `id_notificacion bigint identity PK`, `id_mensaje uuid not null`, `tipo varchar(60) not null`, `destinatario varchar(120) not null`, `estado varchar(10) check in ('ENVIADA','FALLIDA')`, `intentos int not null default 0`, `error text`, `enviado_en timestamptz`, `creado_en timestamptz default now()`.

### Pruebas
- Unitarias: EventRouter (despacha al handler correcto; tipo desconocido no lanza), lógica de decisión del consumidor (ok → ack; error con intentos < 3 → retry; ≥ 3 → DLQ; envelope inválido → DLQ) usando un canal falso.
- Integración opcional con Testcontainers RabbitMQ (skip si no hay Docker).

**Criterios de aceptación**
- [ ] Con todo levantado, en el panel `http://localhost:15672` existen el exchange y las 3 colas con sus bindings.
- [ ] Publicar desde el panel un mensaje válido con routing key `reserva.creada.v1` → el worker lo registra en su log y lo confirma (ack).
- [ ] Publicar un JSON inválido → termina en `notificaciones.eventos.dlq`.

---

## 7. Variables de entorno (`.env.example`)
```
# PostgreSQL (superusuario del contenedor)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=cambiar_en_local
POSTGRES_DB=losrobles
# Roles por servicio (los crea infra/postgres/init)
CORE_DB_USER=losrobles_core
CORE_DB_PASSWORD=cambiar_en_local
NOTIF_DB_USER=losrobles_notif
NOTIF_DB_PASSWORD=cambiar_en_local
# RabbitMQ
RABBITMQ_DEFAULT_USER=losrobles
RABBITMQ_DEFAULT_PASS=cambiar_en_local
# API
API_PORT=4000
DATABASE_URL=postgres://losrobles_core:cambiar_en_local@db:5432/losrobles
RABBITMQ_URL=amqp://losrobles:cambiar_en_local@rabbitmq:5672
CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=info
ENABLE_DOCS=true
SEED_ON_START=true
SEED_DEFAULT_PASSWORD=LosRobles2026!
# Notificaciones
NOTIF_DATABASE_URL=postgres://losrobles_notif:cambiar_en_local@db:5432/losrobles
SMTP_HOST=mailpit
SMTP_PORT=1025
MAIL_FROM="Centro Deportivo Los Robles <no-reply@losrobles.test>"
PREFETCH=10
# Web (build)
VITE_API_BASE=/api/v1
```
Para ejecutar fuera de Docker se usan las mismas variables cambiando los hosts `db`, `rabbitmq` y `mailpit` por `localhost` (documentarlo en el README).

---

## 8. README
Actualizar `README.md` con: requisitos (Node 22, Docker Desktop), **inicio rápido** (`cp .env.example .env` → `docker compose up -d --build` → URLs de web, API, Swagger, RabbitMQ, Mailpit, pgAdmin), desarrollo local sin Docker para las apps, scripts disponibles, usuarios semilla y estructura del repo.

---

## 9. Definition of Done del Sprint 0 (checklist de revisión de Claude)
- [ ] Todos los criterios de aceptación de HU-00 … HU-05.
- [ ] `npm run lint`, `typecheck`, `test`, `build` en verde desde clon limpio.
- [ ] `docker compose up -d --build` desde cero: api `healthy`, web muestra "API en línea".
- [ ] Sin `any`, sin secretos, sin `console.log` (usar logger), sin código muerto ni TODOs sin issue.
- [ ] Las capas respetan la regla de dependencias (domain no importa express/knex/amqplib).
- [ ] ARQUITECTURA.md actualizado donde este diseño lo cambia (topología RabbitMQ en código).
