#!/bin/bash

# Exit on error.
set -e

# Load nvm (standard location)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Enforce Node.js 22 (install if missing, then switch)
nvm install 22
nvm use 22

#echo "Using Node.js $(node -v)"

# Clean this vscode project
./scripts/clean.sh

npm ci --foreground-scripts --legacy-peer-deps

npx vsce package 

# List the output file.
ls -al apio-*.vsix


