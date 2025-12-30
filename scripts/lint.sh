#!/bin/bash

# Exit on error.
set -e

# Start from scratch
#rm -f *.vsix
#rm -rf node_modules
#rm -rf .vscode-test

#npm install

./scripts/init-test-env.sh

# Run the 'lint' target in packages.json.
npm run lint 

