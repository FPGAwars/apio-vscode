// Utility functions

"use strict";

const fs = require("fs");

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

// Exported functions.
module.exports = { extractApioIniEnvs };
