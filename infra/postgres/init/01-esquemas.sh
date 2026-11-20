#!/usr/bin/env bash
(
set -euo pipefail

: "${CORE_DB_USER:?Falta CORE_DB_USER}" "${CORE_DB_PASSWORD:?Falta CORE_DB_PASSWORD}"
: "${NOTIF_DB_USER:?Falta NOTIF_DB_USER}" "${NOTIF_DB_PASSWORD:?Falta NOTIF_DB_PASSWORD}"

psql --no-psqlrc --set=ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=core_user="$CORE_DB_USER" --set=core_password="$CORE_DB_PASSWORD" \
  --set=notif_user="$NOTIF_DB_USER" --set=notif_password="$NOTIF_DB_PASSWORD" <<'SQL'
BEGIN;
CREATE ROLE :"core_user" LOGIN PASSWORD :'core_password';
CREATE ROLE :"notif_user" LOGIN PASSWORD :'notif_password';
CREATE SCHEMA core AUTHORIZATION :"core_user";
CREATE SCHEMA notificaciones AUTHORIZATION :"notif_user";

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA core FROM PUBLIC, :"notif_user";
REVOKE ALL ON SCHEMA notificaciones FROM PUBLIC, :"core_user";
ALTER ROLE :"core_user" SET search_path TO core;
ALTER ROLE :"notif_user" SET search_path TO notificaciones;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
COMMIT;
SQL
)
