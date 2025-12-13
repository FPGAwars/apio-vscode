// Utility functions

// Standard imports.
import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Local imports
import * as platforms from "./platforms.js";

// Scans apio.ini and return list of env names.
export function extractApioIniEnvs(apioIniFilePath) {
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
export function userHomeDir() {
  return path.resolve(os.homedir());
}

// Get apio home dir, this is an apio managed directory.
export function apioHomeDir() {
  return path.join(userHomeDir(), ".apio");
}

// Get apio bin dir, this where the apio binary resides.
export function apioBinDir() {
  return path.join(apioHomeDir(), "bin");
}

// Get apio temp dir.
export function apioTmpDir() {
  return path.join(apioHomeDir(), "tmp");
}

// Get path of a file or dir in apio temp dir.
export function apioTmpChild(fname) {
  return path.join(apioTmpDir(), fname);
}

// Get apio executable path.
export function apioBinaryPath() {
  const apioBinaryName = platforms.isWindows() ? "apio.exe" : "apio";
  return path.join(apioBinDir(), apioBinaryName);
}

// Get apio demo dir (under the temp directory).
export function apioDemoDir() {
  return apioTmpChild("apio-demo");
}

// Wait for given time in ms.
export async function asyncSleepMs(timeMs) {
  await new Promise((resolve) => setTimeout(resolve, timeMs));
}

// Write a file with given lines.
export function writeFileFromLines(filePath, lines) {
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
export const WorkspaceInfo = ({ wsDirPath, apioIniPath, apioIniExists }) =>
  Object.freeze({ wsDirPath, apioIniPath, apioIniExists });

// Returns a WorkspaceInfo.
export function getWorkspaceInfo() {
  // Determine wsDirPath str, null if workspace is not open.
  const ws = vscode.workspace.workspaceFolders?.[0];
  const wsDirPath = ws ? path.resolve(ws.uri.fsPath) : null;

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
