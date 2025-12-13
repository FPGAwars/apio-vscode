// Utility functions

// Standard imports.
import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as cp from "child_process";

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
  return os.homedir();
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

// Get path of a file in apio temp dir.
export function apioTmpFile(fname) {
  return path.join(apioTmpDir(), fname);
}

// Get apio executable path.
export function apioBinaryPath() {
  const apioBinaryName = platforms.isWindows() ? "apio.exe" : "apio";
  return path.join(apioBinDir(), apioBinaryName);
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

// Populate the given directory with given example and open the project
// with VSCode. If everything goes well, the function does not return as
// VSCode switches to the new workspace.
//
// 'board' and 'example' specify the example to use. 'folder' is the destination
// path. It should not exist and should be an absolute path. 'callback' is
// calls on success and on failure with (ok:bool, text:str).
export async function openProjectFromExample(
  context,
  board,
  example,
  folder,
  callback
) {
  try {
    // Folder path should be absolute.
    if (!path.isAbsolute(folder)) {
      throw new Error(`Error: Folder is not an absolute path: ${folder}`);
    }

    // Use the absolute canonical form of the destination folder. On windows
    // for example, this include the drive letter c:\ even if the user
    // didn't specify it.
    folder = path.resolve(folder);

    // Folder should not exist.
    if (fs.existsSync(folder)) {
      throw new Error("Directory already exists: " + folder);
    }

    // Construct example full name.
    const exampleId = board + "/" + example;

    // Create the destination folder.
    fs.mkdirSync(folder, { recursive: true });

    // Run 'apio examples fetch board/example' in the demo folder.
    await new Promise((resolve, reject) => {
      cp.exec(
        apioBinaryPath() + " examples fetch " + exampleId,
        { cwd: folder },
        (err, _stdout, stderr) => {
          if (err || stderr) {
            reject(
              new Error(
                stderr.trim() || err.message || "Failed to fetch example"
              )
            );
          } else {
            resolve();
          }
        }
      );
    });

    // Here when the example created ok, before we switch to the new project
    // call back with ok status to allow a brief success indication to the user.
    callback(true, "Success! Opening project.");

    // Signal to the apio activate() that will be called on the new
    // workspace to automatically open apio.ini.
    await context.globalState.update("apio.justCreatedProject", true);

    // Switch to the new workspace. This will start a new instance of
    // this extension.
    setTimeout(() => {
      vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.file(folder),
        false
      );
    }, 1200);

    // Here when error.
  } catch (err) {
    callback(false, "Error: " + err.message);
  }
}
