#!/bin/bash
set -e

echo "Resetting database..."

echo "Running migrations..."
npx prisma migrate reset --force

echo "Generating Prisma client..."
npx prisma generate

echo "Seeding database..."
npm run db:seed

echo "Database reset complete!"
