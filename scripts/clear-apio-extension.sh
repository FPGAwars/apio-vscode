#!/bin/bash -x

# Apio VSCode Extension: Uninstall + Full Cache Clear (macOS)
# For local debugging only. 

# Exit on first error
set -e

# Add 'code' to PATH.
export PATH="$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin"

# Uninstall extension
code --uninstall-extension FPGAwars.apio || true

# Clear cache
rm -rf ~/.vscode/extensions/fpgawars.apio-*
rm -rf ~/Library/Application\ Support/Code/Cache
rm -rf ~/Library/Application\ Support/Code/CachedData
rm -rf ~/Library/Application\ Support/Code/CachedExtensions
rm -rf ~/Library/Application\ Support/Code/CachedExtensionVSIXs
rm -rf ~/Library/Application\ Support/Code/Code\ Cache

echo "Done. Restart VSCode, then reinstall your new .vsix:"
echo "code --install-extension apio-*.vsix"
