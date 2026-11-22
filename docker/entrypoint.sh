#!/bin/sh
set -e

DB_HOST_TARGET="${DB_HOST:-db}"
DB_PORT_TARGET="${DB_PORT:-5432}"
DB_NAME_TARGET="${DB_DATABASE:-purchase_request}"
DB_USER_TARGET="${DB_USERNAME:-postgres}"

echo "Waiting for PostgreSQL database to be ready at ${DB_HOST_TARGET}:${DB_PORT_TARGET}..."
until nc -z -v -w30 "$DB_HOST_TARGET" "$DB_PORT_TARGET"; do
  echo "Waiting for connection to ${DB_HOST_TARGET}:${DB_PORT_TARGET}..."
  sleep 2
done

echo "Ensuring PostgreSQL database '${DB_NAME_TARGET}' exists..."
export PGPASSWORD="${DB_PASSWORD}"
if ! psql -h "$DB_HOST_TARGET" -p "$DB_PORT_TARGET" -U "$DB_USER_TARGET" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME_TARGET}'" | grep -q 1; then
  echo "Creating database '${DB_NAME_TARGET}'..."
  psql -h "$DB_HOST_TARGET" -p "$DB_PORT_TARGET" -U "$DB_USER_TARGET" -d postgres -c "CREATE DATABASE \"${DB_NAME_TARGET}\""
fi

echo "PostgreSQL is ready. Running database migrations..."
php artisan migrate --force

echo "Seeding initial users and demo data..."
php artisan db:seed --force

echo "Starting Laravel application server on 0.0.0.0:8000..."
exec php artisan serve --host=0.0.0.0 --port=8000
