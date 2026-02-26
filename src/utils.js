// Utility functions

// Standard imports.
const vscode = require("vscode");
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("node:assert");
const { performance } = require("perf_hooks");

// Local imports
const platforms = require("./platforms.js");
const apioLog = require("./apio-log.js");

// Scans apio.ini and return list of env names.
function extractApioIniEnvs(apioIniFilePath) {
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
  return path.normalize(path.resolve(os.homedir()));
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

// Get path of a file or dir in apio temp dir.
function apioTmpChild(fname) {
  return path.join(apioTmpDir(), fname);
}

// Get apio executable path.
function apioBinaryPath() {
  const apioBinaryName = platforms.isWindows() ? "apio.exe" : "apio";
  return path.join(apioBinDir(), apioBinaryName);
}

// Get apio demo dir (under the temp directory).
function apioDemoDir() {
  return apioTmpChild("apio-demo");
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

// An immutable data object with workspace info.
const WorkspaceInfo = ({ wsDirPath, apioIniPath, apioIniExists }) =>
  Object.freeze({ wsDirPath, apioIniPath, apioIniExists });

// Returns a WorkspaceInfo.
function getWorkspaceInfo() {
  // Determine wsDirPath str, null if workspace is not open.
  const ws = vscode.workspace.workspaceFolders?.[0];
  const wsDirPath = ws ? path.normalize(path.resolve(ws.uri.fsPath)) : null;

  // Determine apioIniPath str, null if workspace is not open.
  const apioIniPath = wsDirPath ? path.join(wsDirPath, "apio.ini") : null;

  // Determine apioIniExists bool, true if workspace is open and apio.ini exists.
  const apioIniExists = apioIniPath ? fs.existsSync(apioIniPath) : false;

  // Pack as an immutable object and return.
  return WorkspaceInfo({
    wsDirPath: wsDirPath,
    apioIniPath: apioIniPath,
    apioIniExists: apioIniExists,
  });
}

/**
 * Ensures the Apio demo directory exists and is completely empty.
 * Fails strictly if any content cannot be deleted.
 * @returns {Promise<string>} The path to the verified empty demo directory.
 */
async function prepareEmptyApioDemoDir() {
  const demoDir = apioDemoDir();

  // Safety assertion to prevent operations on unexpected paths
  assert(
    demoDir.includes("apio-demo"),
    `Expected Apio demo directory to contain "apio-dir" in its path for safety, but got: ${demoDir}`,
  );

  await fs.promises.mkdir(demoDir, { recursive: true });

  // Read only entry names (sufficient for unified deletion)
  const entryNames = await fs.promises.readdir(demoDir);

  const deletePromises = entryNames.map(async (entryName) => {
    const fullPath = path.join(demoDir, entryName);
    try {
      await fs.promises.rm(fullPath, { recursive: true, force: true });
    } catch (err) {
      throw new Error(`Failed to delete "${fullPath}": ${err.message}`);
    }
  });

  await Promise.all(deletePromises);

  // All done ok.
  return demoDir;
}

/**
 * Determines whether opening the given destinationUri with vscode.openFolder
 * will most likely cause a workspace switch / window reload.
 *
 * Returns true  → switch/reload is expected (different workspace)
 * Returns false → no switch expected (same workspace, command usually does nothing)
 *
 * Important: This function assumes a **single-folder workspace**.
 *            For multi-root workspaces the logic needs to be extended.
 *
 * @param {vscode.Uri} destinationUri - The target folder URI you want to open
 * @returns {Promise<boolean>} true = will cause workspace change
 */
function willCauseWorkspaceChange(destinationUri) {
  apioLog.msg("willCauseWorkspaceChange() called.");
  // No current workspace → opening any folder will cause a change
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length === 0
  ) {
    apioLog.msg("No open folders -> same");
    return true;
  }

  // For simplicity we assume single-folder workspace (most common case)
  const n = vscode.workspace.workspaceFolders.length;
  if (vscode.workspace.workspaceFolders.length !== 1) {
    // For multi-root → usually no full reload, but treat as change conservatively
    apioLog.msg(`num folders = ${n} -> true`);
    return true;
  }

  const currentFolder = vscode.workspace.workspaceFolders[0];
  const currentUri = currentFolder.uri;

  // VS Code normalizes fsPath (especially on Windows: drive letter → lowercase)
  // This matches VS Code internal behavior when deciding whether to reload
  function normalize(uri) {
    let fsPath = uri.fsPath;

    // Extra safety: resolve + normalize separators (helps with trailing slashes etc.)
    fsPath = path.resolve(fsPath).replace(/\\/g, "/");

    // On Windows VS Code internally lowercases drive letter in fsPath
    // We replicate this conservative behavior
    if (process.platform === "win32") {
      return fsPath.toLowerCase();
    }

    return fsPath;
  }

  const normalizedCurrent = normalize(currentUri);
  const normalizedTarget = normalize(destinationUri);

  apioLog.msg(`normalizedCurrent: ${normalizedCurrent}`);
  apioLog.msg(`normalizedTarget: ${normalizedTarget}`);

  const isSame = normalizedCurrent === normalizedTarget;
  apioLog.msg(`isSame: ${isSame}`);

  return !isSame;
}

/**
 * Creates a named timing measurement object.
 * Call .done() to stop the timer and log the duration via apioLog.msg().
 *
 * Usage:
 *   const finishFetch = timing('Fetching example');
 *   // ... your operation ...
 *   finishFetch.done();          // → logs: Fetching example: 342.15 ms
 */
function timing(label) {
  const start = performance.now();

  return {
    done: () => {
      const duration = performance.now() - start;
      apioLog.msg(`${label}: ${duration.toFixed(2)} ms`);
    },
  };
}

// Exported for require().
module.exports = {
  extractApioIniEnvs,
  userHomeDir,
  apioHomeDir,
  apioBinDir,
  apioTmpDir,
  apioTmpChild,
  apioBinaryPath,
  apioDemoDir,
  asyncSleepMs,
  writeFileFromLines,
  WorkspaceInfo,
  getWorkspaceInfo,
  prepareEmptyApioDemoDir,
  willCauseWorkspaceChange,
  timing,
};
