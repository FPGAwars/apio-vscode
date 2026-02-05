// src/constants.js
//
// ---------------------------------------------------------------
// Centralized constants for the Apio VS Code extension.
// ---------------------------------------------------------------

// GitHub repository that hosts the pre-built Apio bundles
// https://github.com/FPGAwars/apio-dev-builds/releases
//
const APIO_CLI_RELEASE_REPO = "fpgawars/apio";

// Release tag (YYYY-MM-DD) – matches git tag and PyPI version
// Change ONLY this line when you publish a new daily build.
//
const APIO_CLI_RELEASE_TAG = "2026-02-04";

// Export for require()
module.exports = {
  APIO_CLI_RELEASE_REPO,
  APIO_CLI_RELEASE_TAG,
};
