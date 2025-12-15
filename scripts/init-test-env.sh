#!/bin/bash  -x

# Run this once to setup the test env. Otherwise tests will not work.

# Exit on error.
set -e

./scripts/clean.sh

# rm -f *.vsix
# rm -rf node_modules
# rm -rf .vscode-test

npm install

