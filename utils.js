// Utility functions

"use strict";

// Standard imports.
const fs = require("fs");
const os = require("os");
const path = require("path");

// Local imports
const platforms = require("./apio-platforms.js");


// Scans apio.ini and return list of env names.
function extractApioIniEnvs(apioIniFilePath) {
  // const fs = require("fs");
  try {
    const content = fs.readFileSync(apioIniFilePath, "utf8");
    const lines = content.split(/\r?\n/);
    const envs = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments (both ; and #)
      if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#")) {
        continue;
      }

      // Match [env:name]
      const match = trimmed.match(/^\[env:([^\]]+)\]$/);
      if (match) {
        envs.push(match[1].trim());
      }
    }

    return envs;
  } catch (err) {
    console.error("Failed to read apio.ini:", err);
    return [];
  }
}

// Get the user home dir
function userHomeDir() {
  return os.homedir();
}

// Get apio home dir, this is an apio managed directory.
function apioHomeDir() {
  return path.join(userHomeDir(), ".apio");
}

// Get apio bin dir, this where the apio binary resides.
function apioBinDir() {
  return path.join(apioHomeDir(), "bin");
}

// Get apio temp dir.
function apioTmpDir() {
  return path.join(apioHomeDir(), "tmp");
}

// Get apio executable path.
function apioBinaryPath() {
  const apioBinaryName = platforms.isWindows() ? "apio.exe" : "apio";
  return path.join(apioBinDir(), apioBinaryName);
}

// Exported functions.
module.exports = {
  extractApioIniEnvs,
  userHomeDir,
  apioHomeDir,
  apioBinDir,
  apioTmpDir,
  apioBinaryPath,
};
