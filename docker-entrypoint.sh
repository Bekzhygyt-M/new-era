#!/bin/sh
set -e

# A mounted volume arrives owned by root, so the unprivileged app user could not
# write the database or uploaded files. Fix ownership once, then drop root.
DATA_ROOT="${DATA_DIR:-/data}"
mkdir -p "$DATA_ROOT/data" "$DATA_ROOT/private/uploads"
chown -R nextjs:nodejs "$DATA_ROOT"

exec gosu nextjs "$@"
