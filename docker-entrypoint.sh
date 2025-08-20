#!/usr/bin/env sh
set -e

# Run DB migrations if Prisma schema exists
if [ -f "./prisma/schema.prisma" ]; then
  echo "→ Prisma migrate deploy…"
  npx prisma migrate deploy || true
fi

# Optional: run seed if env says so
# This expects either:
#  - prisma/seed.js  (plain Node), or
#  - prisma/seed.ts with tsx installed (devDependency)
if [ "$SEED_ON_BOOT" = "true" ]; then
  if [ -f "./prisma/seed.js" ]; then
    echo "→ Running JS seed…"
    node prisma/seed.js || true
  elif [ -f "./prisma/seed.ts" ]; then
    echo "→ Running TS seed via tsx…"
    npx tsx prisma/seed.ts || true
  fi
fi

exec "$@"
