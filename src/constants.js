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
const APIO_CLI_RELEASE_TAG = "2026-01-30";

// Place holder for the default apio env. This is the value that
// is displayed to the user in the apio env selector to indicate
// 'use default apio env'.
const APIO_ENV_DEFAULT = "(default)";

// Export for require()
module.exports = {
  APIO_CLI_RELEASE_REPO,
  APIO_CLI_RELEASE_TAG,
  APIO_ENV_DEFAULT,
};
