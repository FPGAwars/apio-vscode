#!/bin/bash  -x

# An installation script for local developement. Not used the the 
# published package.

# Exit on error.
set -e

# Build
./scripts/build.sh

# Add 'code' to PATH.
export PATH="$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin"

# List the output file.
ls -al apio-*.vsix

# Uninstall. Ignore 'not installed' error.
if code --list-extensions | grep -q '^fpgawars.apio$'; then
  code --uninstall-extension fpgawars.apio
fi

# Remove local cache
rm -rf ~/.vscode/extensions/fpgawars.apio*

# List the files included in the package
#unzip -l apio-*.vsix

# Install 
code --install-extension apio-*.vsix 


du -sh apio-*.vsix
