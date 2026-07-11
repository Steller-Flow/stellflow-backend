#!/bin/bash
set -e

echo "Running database migrations..."
npx prisma migrate dev "$@"

echo "Generating Prisma client..."
npx prisma generate

echo "Migration complete!"
