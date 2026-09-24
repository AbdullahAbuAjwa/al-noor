#!/bin/sh
set -eu

# Fail startup if migration fails; never serve an incompatible schema.
node --import tsx scripts/migrate.ts
exec node server.js
