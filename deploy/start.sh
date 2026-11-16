#!/bin/sh
# Starts PostgreSQL inside the container, applies migrations, then runs the API,
# which also serves the built frontend. Secrets are generated fresh on every start.
set -eu

PGDATA=/var/lib/postgresql/data
PGBIN=$(dirname "$(find /usr/lib/postgresql -name initdb -type f | head -n 1)")
secret() { python -c "import secrets; print(secrets.token_hex(32))"; }

export DB_HOST=127.0.0.1 DB_PORT=5432 DB_NAME=neurocare_db DB_USER=neurocare
export DB_PASSWORD="$(secret)"
export SECRET_KEY="${SECRET_KEY:-$(secret)}"
export FRONTEND_URL="${RENDER_EXTERNAL_URL:-http://localhost:${PORT}}"

mkdir -p "$PGDATA" && chown -R postgres:postgres /var/lib/postgresql
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  gosu postgres "$PGBIN/initdb" -D "$PGDATA" --auth-local=trust --auth-host=scram-sha-256 >/dev/null
fi
# Small memory settings: the free instance has 512 MB for everything.
gosu postgres "$PGBIN/pg_ctl" -D "$PGDATA" -w -l /var/lib/postgresql/server.log \
  -o "-c listen_addresses=127.0.0.1 -c shared_buffers=24MB -c max_connections=20" start

gosu postgres psql -v ON_ERROR_STOP=1 -q -v password="$DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE neurocare LOGIN PASSWORD %L', :'password')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'neurocare') \gexec
SELECT format('ALTER ROLE neurocare PASSWORD %L', :'password') \gexec
SELECT 'CREATE DATABASE neurocare_db OWNER neurocare'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'neurocare_db') \gexec
SQL

cd /app/backend
python -m alembic upgrade head
# The platform's proxy is the only way in, so its forwarded client address is trusted
# (the rate limit counts per visitor, not per proxy).
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --proxy-headers --forwarded-allow-ips "*"
