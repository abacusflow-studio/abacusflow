#!/bin/sh
set -eu

cube_user="${POSTGRES_CUBE_USER:-abacusflow_cube}"
cube_password="${POSTGRES_CUBE_PASSWORD:?POSTGRES_CUBE_PASSWORD must be set}"
postgres_host="${POSTGRES_HOST:-postgres}"
postgres_port="${POSTGRES_PORT:-5432}"
postgres_database="${POSTGRES_DB:-postgres}"
postgres_user="${POSTGRES_USER:-postgres}"

if [ "$cube_user" = "$postgres_user" ] || [ "$cube_user" = "${POSTGRES_USER:-abacusflow_app}" ]; then
    echo "POSTGRES_CUBE_USER must be a dedicated database role" >&2
    exit 1
fi

export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"

until pg_isready \
    --host "$postgres_host" \
    --port "$postgres_port" \
    --dbname "$postgres_database" \
    --username "$postgres_user" >/dev/null 2>&1; do
    sleep 1
done

until psql \
    --host "$postgres_host" \
    --port "$postgres_port" \
    --username "$postgres_user" \
    --dbname "$postgres_database" \
    --tuples-only \
    --no-align \
    --command "SELECT EXISTS (SELECT 1 FROM flyway_schema_history WHERE version = '003' AND success)" \
    2>/dev/null | grep -qx t; do
    sleep 1
done

psql -v ON_ERROR_STOP=1 \
    --host "$postgres_host" \
    --port "$postgres_port" \
    --username "$postgres_user" \
    --dbname "$postgres_database" \
    --set=cube_user="$cube_user" \
    --set=cube_password="$cube_password" <<-'EOSQL'
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'abacusflow_cube_reader') THEN
        CREATE ROLE abacusflow_cube_reader
            NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    END IF;
END
$$;

SELECT format(
    'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOBYPASSRLS',
    :'cube_user',
    :'cube_password'
)
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'cube_user')
\gexec

SELECT format(
    'ALTER ROLE %I PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOBYPASSRLS',
    :'cube_user',
    :'cube_password'
)
\gexec

SELECT format('GRANT abacusflow_cube_reader TO %I', :'cube_user')
\gexec
EOSQL
