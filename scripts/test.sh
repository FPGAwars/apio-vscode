#!/bin/bash

# IMPORTANT: Run scripts/init-test-env.sh once before running the tests.

# Bash script to run VS Code extension tests using npx vscode-test
# Usage:
#   ./scripts/test.sh                 # Runs with 'stable' (latest stable VS Code)
#   ./scripts/test.sh  1.85.0         # Runs with specific version 1.85.0
#   ./scripts/test.sh  insiders       # Runs with latest Insiders build
#   ./scripts/test.sh  stable         # Runs with latest Stable build

set -euo pipefail

# Construct the command
CMD="npx vscode-test"

# Execute the command
echo "Running: $CMD"
exec $CMD
