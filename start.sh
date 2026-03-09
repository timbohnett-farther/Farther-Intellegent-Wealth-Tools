#!/bin/sh
set -e

# Initialize the SQLite database schema if it doesn't exist
# Use direct path since node_modules/.bin is not available in standalone output
node node_modules/prisma/build/index.js db push --skip-generate

# Start the Next.js server
exec node server.js
