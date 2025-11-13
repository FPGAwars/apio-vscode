#!/bin/bash -x
set -e

# Add 'code' to PATH.
export PATH="$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin"

#npm install -g @vscode/vsce
npm install -g @vscode/vsce@latest

#!/bin/bash
#set -e

#echo "=== VSCode Marketplace Readiness Check ==="

# 1. Package with dry-run (validates everything the Marketplace checks)
# vsce package --dry-run

vsce package

# echo "All Marketplace checks passed!"
# echo "You can now publish with:"
# echo "   vsce publish"


