#!/bin/sh
set -e

echo "=== Farther Intelligent Wealth Tools — Starting ==="
echo "NODE_ENV=$NODE_ENV"
echo "PORT=$PORT"
echo "HOSTNAME=$HOSTNAME"
echo "DATABASE_URL=$DATABASE_URL"
echo "Working directory: $(pwd)"
echo ""

# Initialize the SQLite database schema if it doesn't exist
echo "--- Running prisma db push ---"
node node_modules/prisma/build/index.js db push \
  --schema prisma/schema.prisma \
  --url "$DATABASE_URL" \
  --skip-generate 2>&1 || {
    echo "!!! prisma db push failed (exit $?), attempting to continue..."
  }
echo "--- prisma db push complete ---"
echo ""

# Start the Next.js server
echo "--- Starting Next.js server on port $PORT ---"
exec node server.js
