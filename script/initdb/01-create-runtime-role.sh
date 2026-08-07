#!/bin/sh
set -eu

app_user="${POSTGRES_USER:-abacusflow_app}"
app_password="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"
cube_user="${POSTGRES_CUBE_USER:-abacusflow_cube}"
cube_password="${POSTGRES_CUBE_PASSWORD:?POSTGRES_CUBE_PASSWORD must be set}"

if [ "$cube_user" = "$POSTGRES_USER" ] || [ "$cube_user" = "$app_user" ]; then
    echo "POSTGRES_CUBE_USER must be a dedicated database role" >&2
    exit 1
fi

psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --set=app_user="$app_user" \
    --set=app_password="$app_password" \
    --set=cube_user="$cube_user" \
    --set=cube_password="$cube_password" <<-'EOSQL'
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'abacusflow_runtime') THEN
        CREATE ROLE abacusflow_runtime
            NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    END IF;
END
$$;

SELECT format(
    'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOBYPASSRLS',
    :'app_user',
    :'app_password'
)
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'app_user')
\gexec

SELECT format('GRANT abacusflow_runtime TO %I', :'app_user')
\gexec

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

SELECT format('GRANT abacusflow_cube_reader TO %I', :'cube_user')
\gexec
EOSQL
