#!/bin/sh
set -e

# Initialize the SQLite database schema if it doesn't exist
npx prisma db push --skip-generate

# Start the Next.js server
exec node server.js
