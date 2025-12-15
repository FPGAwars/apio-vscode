#!/bin/bash  -x

# Run this once to setup the test env. Otherwise tests will not work.

# Exit on error.
set -e

./scripts/clean.sh

mkdir -p .vscode-test/workspace

npm ci

