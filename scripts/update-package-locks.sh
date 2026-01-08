#!/bin/bash -x

# Refresh the versions of npm modules used by this package.
# This updates package-lock.json which we check into github
# and it guides the build-pre-release.yaml workflow.

# Exit on first error
set -e

rm -rf node_modules
rm -f package-lock.json

# Do we need this?
#npm install --save-dev globals

# Update package-lock.json
# Add --no-audit if it's too flaky.
npm install \
  --package-lock-only \
  --foreground-scripts \
  --legacy-peer-deps \
  --engine-strict \
  --progress=false

# Update node-modules based on package-lock.
npm ci --foreground-scripts --legacy-peer-deps
