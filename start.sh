#!/bin/sh
set -e

# Initialize the SQLite database schema if it doesn't exist
# Use direct path since node_modules/.bin is not available in standalone output
# Pass --schema and --url explicitly to provide datasource configuration
node node_modules/prisma/build/index.js db push \
  --schema prisma/schema.prisma \
  --url "$DATABASE_URL"

# Start the Next.js server
exec node server.js
