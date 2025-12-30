#!/bin/bash

# Run this once to setup the test env. Otherwise tests will not work.

# Exit on error.
set -e

# Avoid a conflict when running under github.
unset npm_config_prefix

# Load nvm (standard location)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Enforce Node.js 22 (install if missing, then switch)
nvm install 22
nvm use 22

./scripts/clean.sh

mkdir -p .vscode-test/workspace

npm ci

