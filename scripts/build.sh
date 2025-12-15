#!/bin/bash  -x

# Exit on error.
set -e

./scripts/clean.sh

npm ci --foreground-scripts --legacy-peer-deps

npx vsce package 

# List the output file.
ls -al apio-*.vsix


