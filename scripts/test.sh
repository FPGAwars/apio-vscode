#!/bin/bash  -x

# Runs the tests, Assumes that ./scripts/init-test-env.sh was
# run at least once.

# Exit on error.
set -e

#rm -f *.vsix
#rm -rf node_modules
#rm -rf .vscode-test


# npm install

npm test

