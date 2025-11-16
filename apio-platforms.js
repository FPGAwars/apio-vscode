/**
 * platforms.js
 * -------------
 * Platform detection utilities for VS Code extensions.
 *
 * Exported API:
 *   getPlatformId() → string          // one of the 5 standardized IDs (cached)
 *   isWindows()     → boolean
 *   isDarwin()      → boolean
 *   isLinux()       → boolean
 *
 * Supported platform IDs:
 *   darwin-arm64, darwin-x86-64, linux-x86-64,
 *   linux-aarch64, windows-amd64
 */

"use strict";

const process = require("process");

/**
 * Cached platform identifier.
 * Set on first successful call to getPlatformId().
 * @type {string|null}
 */
let _cachedPlatformId = null;

/**
 * Returns the standardized platform identifier.
 * The result is cached after the first successful call.
 *
 * @returns {string} One of the five supported platform IDs.
 * @throws {Error} If the platform/architecture is unsupported.
 */
function getPlatformId() {
  // Return cached value if already computed
  if (_cachedPlatformId !== null) {
    return _cachedPlatformId;
  }

  const platform = process.platform; // 'darwin' | 'linux' | 'win32' | ...
  const arch = process.arch; // 'arm64' | 'x64' | ...

  let id;

  // macOS
  if (platform === "darwin") {
    if (arch === "arm64") id = "darwin-arm64";
    else if (arch === "x64") id = "darwin-x86-64";
  }
  // Linux
  else if (platform === "linux") {
    if (arch === "arm64") id = "linux-aarch64";
    else if (arch === "x64") id = "linux-x86-64";
  }
  // Windows
  else if (platform === "win32") {
    if (arch === "x64") id = "windows-amd64";
  }

  if (!id) {
    throw new Error(`Unsupported platform: ${platform}-${arch}`);
  }

  // Cache and return
  _cachedPlatformId = id;
  return id;
}

/**
 * Quick boolean checks – all based on the cached platform ID.
 */
function isWindows() {
  return getPlatformId().startsWith("windows-");
}
function isDarwin() {
  return getPlatformId().startsWith("darwin-");
}
function isLinux() {
  return getPlatformId().startsWith("linux-");
}

/* ------------------------------------------------------------------ */
/* Module exports                                                     */
/* ------------------------------------------------------------------ */
module.exports = {
  getPlatformId,
  isWindows,
  isDarwin,
  isLinux,
};
