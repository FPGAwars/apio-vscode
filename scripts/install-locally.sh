#!/bin/bash  -x

# An installation script for local developement. Not used the the 
# published package.

# Exit on error.
set -e

# One time installation.
# brew update
# brew install node

# Add 'code' to PATH.
export PATH="$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin"

rm -f *.vsix

# Clean install – guaranteed identical to anyone else with the same lockfile
rm -rf node_modules
npm ci --foreground-scripts --legacy-peer-deps

# Do we need this?
npm install --save-dev globals

# Build
npx vsce package 

# List the output file.
ls -al apio-*.vsix

# Uninstall. Ignore 'not installed' error.
if code --list-extensions | grep -q '^fpgawars.apio$'; then
  code --uninstall-extension fpgawars.apio
fi

# List the files included in the package
#unzip -l apio-*.vsix

# Install 
#code --verbose --install-extension apio-*.vsix 
code --install-extension apio-*.vsix 



