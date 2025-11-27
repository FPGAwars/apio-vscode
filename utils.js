// Utility functions

"use strict";

// Standard imports.
const fs = require("fs");
const os = require("os");
const path = require("path");

// Local imports
const platforms = require("./platforms.js");

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

// Get path of a file in apio temp dir.
function apioTmpFile(fname) {
  return path.join(apioTmpDir(), fname);
}

// Get apio executable path.
function apioBinaryPath() {
  const apioBinaryName = platforms.isWindows() ? "apio.exe" : "apio";
  return path.join(apioBinDir(), apioBinaryName);
}

// Wait for given time in ms.
async function asyncSleepMs(timeMs) {
  await new Promise((resolve) => setTimeout(resolve, timeMs));
}

// Write a file with given lines.
function writeFileFromLines(filePath, lines) {
  // Ensure the content is properly joined with the desired line ending
  const content = lines.join(os.EOL) + os.EOL;

  // Extract the directory portion of the path
  const dir = path.dirname(filePath);

  // Synchronously create parent directories (recursive: true)
  fs.mkdirSync(dir, { recursive: true });

  // Write the file, overwriting if it exists
  fs.writeFileSync(filePath, content, { encoding: "utf8" });
  // Optional: add a trailing newline if desired
  // if (content && !content.endsWith(lineEnding)) {
  //   fs.appendFileSync(filePath, lineEnding);
  // }
}

// Exported functions.
module.exports = {
  extractApioIniEnvs,
  userHomeDir,
  apioHomeDir,
  apioBinDir,
  apioTmpDir,
  apioTmpFile,
  apioBinaryPath,
  asyncSleepMs,
  writeFileFromLines,
};
