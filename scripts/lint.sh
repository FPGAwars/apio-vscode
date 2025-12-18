#!/bin/bash -x

# Exit on error.
set -e

# Start from scratch
#rm -f *.vsix
#rm -rf node_modules
#rm -rf .vscode-test

#npm install

./scripts/init-test-env.sh

npm run lint

