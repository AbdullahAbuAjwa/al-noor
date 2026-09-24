#!/bin/sh
set -eu

# Fail startup if migration fails; never serve an incompatible schema.
node --import tsx scripts/migrate.ts
node --import tsx scripts/seed.ts
exec node server.js
