#!/bin/bash
set -e

echo "Deploying database migrations to production..."
npx prisma migrate deploy

echo "Generating Prisma client..."
npx prisma generate

echo "Production migration complete!"
