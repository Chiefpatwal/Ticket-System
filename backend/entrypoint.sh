#!/bin/sh
set -e

# Wait until PostgreSQL is accepting connections
echo "Waiting for PostgreSQL at $POSTGRES_HOST:$POSTGRES_PORT..."
until nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
  sleep 1
done
echo "PostgreSQL is up."

# Apply migrations automatically
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Launch the application server
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 3 \
  --timeout 60 \
  --access-logfile - \
  --error-logfile -
