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

# Make sure all the dependencies are in node_modules
npm install

# Build
npx vsce package 

# List the output file.
ls -al apio-*.vsix

# Uninstall
code --uninstall-extension fpgawars.apio

# List the files included in the package
#unzip -l apio-*.vsix

# Install 
#code --verbose --install-extension apio-*.vsix 
code --install-extension apio-*.vsix 



