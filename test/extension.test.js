// To run the test interactively in VS Code, run ./scripts/init-test-env.sh
// and use the extension ms-vscode.extension-test-runner to run the test
// interactively, with or without debug.

// NOTE: We don't know how to test commands such as 'demo project' and 'get examples'
// which switch the workspace. This causes the test to fail.

// Standard imports
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const childProcess = require("child_process");
const util = require("util");
const assert = require("assert");

// Local imports
const utils = require("../utils.js");

// Convert exec() to promise form.
const exec = util.promisify(childProcess.exec);

// const BRIEF_DELAY_SECS = 3;
const BRIEF_DELAY_SECS = 3;

// Short delay to let the user view the results on the test
// vscode window.
async function briefDelay(secs = BRIEF_DELAY_SECS) {
  const delayMs = Math.trunc(1000 * secs);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

//  Returns true if the file exists in the workspace, false if it does not.
//  Throws only on unexpected filesystem errors (e.g., permission issues).
async function fileExistsInWorkspace(relPath) {
  const filePath = path.join(workspaceDirPath(), relPath);
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    // Re-throw unexpected errors (e.g., EACCES)
    throw error;
  }
}

// Executes a shell command asynchronously.
// Logs stdout and stderr.
// Throws an exception if the command fails (non-zero exit code), including full error details.
// @param {string} command - The command to execute
async function execAsync(command) {
  let stdout, stderr;
  try {
    const result = await exec(command);
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    // error is populated only on failure
    stdout = error.stdout;
    stderr = error.stderr;
    console.log("Subprocess failed with error:", error);
    console.log("Subprocess stdout:", stdout);
    console.log("Subprocess stderr:", stderr);
    throw error; // Fails the test automatically
  }

  // Success path
  console.log("Subprocess stdout:", stdout);
  console.log("Subprocess stderr:", stderr);
  return { stdout, stderr };
}

function workspaceDirPath() {
  const result = path.resolve(__dirname, "..", ".vscode-test", "workspace");
  return result;
}

// Asynchronously cleans all files and subdirectories inside .vscode-test/workspace
// while preserving the workspace directory itself.
// The directory is created if it does not exist.
async function cleanWorkspaceContents() {
  const workspacePath = workspaceDirPath();

  // Get list of entires.
  const entries = await fs.promises.readdir(workspacePath, {
    withFileTypes: true,
  });

  // Remove each entry recursively
  for (const entry of entries) {
    const fullPath = path.join(workspacePath, entry.name);
    console.log(`Removing: ${fullPath}`);
    await fs.promises.rm(fullPath, { recursive: true, force: true });
  }

  console.log(`Successfully emptied workspace at ${workspacePath}).`);
}

// Populates the test workspace with the given example project.
// Caller should make sure workspace is empty.
async function populateEmptyWorkspaceFromExample(example) {
  // Populate the workspace with the fixed project
  const apioBinaryPath = utils.apioBinaryPath();
  const wsDirPath = workspaceDirPath();
  const command = `${apioBinaryPath} examples fetch ${example} -d "${wsDirPath}"`;

  console.log("Command:", command);

  // Execute the command using the existing execAsync helper
  await execAsync(command);
}

suite("Integration tests", () => {
  // Suite setup.
  suiteSetup(async function () {
    // Prolog
    console.log("suiteSetup(): called");
    this.timeout(60000); // 60 secs timeout for the setup.

    // Activate the extension. This registers the commands.
    await vscode.extensions.getExtension("fpgawars.apio").activate();

    // Force installation of apio binary and it's packages.
    await vscode.commands.executeCommand("apio.packagesUpdate");
    await briefDelay();

    // Make sure the workspace is empty.
    await cleanWorkspaceContents();
  });

  // Test 'apio version'. This is a basic command that doesn't use
  // the packages and does nothing.
  test("test-apio-version", async function () {
    //Prolog
    console.log("test-apio-version test started");
    this.timeout(10000); // 5 secs timeout for this function.

    // Invoke the command.
    await vscode.commands.executeCommand("apio.version");
    await briefDelay();
  });

  // Test the project build functions
  test("test-build", async function () {
    // Epilog
    console.log("test-build test started");
    this.timeout(120 * 1000); // 120 secs timeout for this function. Windows is slow.

    // Populate the workspace
    await populateEmptyWorkspaceFromExample("alhambra-ii/getting-started");

    // Issue build command
    await vscode.commands.executeCommand("apio.build");
    await briefDelay();

    // Issue lint command
    await vscode.commands.executeCommand("apio.lint");
    await briefDelay();

    // Issue test command
    await vscode.commands.executeCommand("apio.test");
    await briefDelay();

    // Check generated files
    assert(await fileExistsInWorkspace("_build/default/hardware.json"));
    assert(await fileExistsInWorkspace("_build/default/hardware.pnr"));
    assert(await fileExistsInWorkspace("_build/default/hardware.asc"));
    assert(await fileExistsInWorkspace("_build/default/hardware.bin"));
    assert(await fileExistsInWorkspace("_build/default/main_tb.out"));
    assert(await fileExistsInWorkspace("_build/default/main_tb.vcd"));

    // Issue clean command
    await vscode.commands.executeCommand("apio.clean");
    await briefDelay();

    // Verify that _build is cleaned.
    assert(!(await fileExistsInWorkspace("_build")));
  });
});
