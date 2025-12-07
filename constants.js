// src/constants.js
//
// ---------------------------------------------------------------
// Centralized constants for the Apio VS Code extension.
// ---------------------------------------------------------------

// GitHub repository that hosts the pre-built Apio bundles
// https://github.com/FPGAwars/apio-dev-builds/releases
const APIO_RELEASE_GITHUB_REPO = "FPGAwars/apio-dev-builds";

// Release tag (YYYY-MM-DD) – matches git tag and PyPI version
// Change ONLY this line when you publish a new daily build.
const APIO_RELEASE_TAG = "2025-12-07";

// Export everything for require()
module.exports = {
  APIO_RELEASE_GITHUB_REPO,
  APIO_RELEASE_TAG,
};
