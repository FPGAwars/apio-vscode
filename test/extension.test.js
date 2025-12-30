// To run the test interactively in VS Code, run ./scripts/init-test-env.sh
// and use the extension ms-vscode.extension-test-runner to run the test
// interactively, with or without debug. Alternatively, run using ./scripts/test.sh.

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
const main = require("../src/main.js");
const utils = require("../src/utils.js");

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
  const result = path.normalize(
    path.resolve(__dirname, "..", ".vscode-test", "workspace")
  );
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
  // Per suite setup.
  suiteSetup(async function () {
    // Prolog
    console.log("suiteSetup(): called");
    this.timeout(10 * 60 * 1000); // 10 min timeout, for windows,

    // Activate the extension. This registers the commands.
    await vscode.extensions.getExtension("fpgawars.apio").activate();

    // Force installation of apio binary and it's packages.
    await vscode.commands.executeCommand("apio.packagesUpdate");
    await briefDelay();
  });

  // Per test setup.
  setup(async function () {
    // Prolog
    console.log("setup(): called");

    // Make sure the workspace is empty.
    await cleanWorkspaceContents();
  });

  // Test 'apio version'. This is a basic command that doesn't use
  // the packages and does nothing.
  test("test-apio-version", async function () {
    //Prolog
    console.log("test-apio-version test started");
    this.timeout(10000); // 10 secs timeout.

    // Invoke the command.
    await vscode.commands.executeCommand("apio.version");
    await briefDelay();

    // Test done ok.
  });

  // Test that the extension tracks properly the workspace state.
  test("test-extension-config", async function () {
    // Epilog
    console.log("test-extensions-config test started");
    this.timeout(10 * 60 * 1000); // 10 min timeout, for windows,

    // Initial state, workspace exists, no apio.ini.
    assert(!(await fileExistsInWorkspace("apio.ini")));

    assert.deepStrictEqual(main.getConfigSummary(), {
      noticeViewEnabled: true,
      projectViewEnabled: false,
      toolsViewEnabled: true,
      helpViewEnabled: true,
      statusBarEnabled: false,
    });

    // Populate the workspace
    await populateEmptyWorkspaceFromExample("alhambra-ii/getting-started");
    assert(await fileExistsInWorkspace("apio.ini"));

    // Give the extension sufficient time to change state.
    await briefDelay((secs = 10));

    // Check extension config.
    assert.deepStrictEqual(main.getConfigSummary(), {
      noticeViewEnabled: false,
      projectViewEnabled: true,
      toolsViewEnabled: true,
      helpViewEnabled: true,
      statusBarEnabled: true,
    });

    // Delete apio.ini file.
    const apioIniPath = path.join(workspaceDirPath(), "apio.ini");
    await fs.promises.unlink(apioIniPath);

    // Give the extension sufficient time to change state.
    await briefDelay((secs = 10));

    // Check extension config.
    assert.deepStrictEqual(main.getConfigSummary(), {
      noticeViewEnabled: true,
      projectViewEnabled: false,
      toolsViewEnabled: true,
      helpViewEnabled: true,
      statusBarEnabled: false,
    });

    // Test done ok.
  });

  // Test the project build functions
  test("test-build", async function () {
    // Epilog
    console.log("test-build test started");
    this.timeout(10 * 60 * 1000); // 10 min timeout, for windows,

    // The test setup leave the workspace empty.
    assert(!(await fileExistsInWorkspace("apio.ini")));

    // Populate the workspace
    await populateEmptyWorkspaceFromExample("alhambra-ii/getting-started");
    assert(await fileExistsInWorkspace("apio.ini"));

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

    // Test done ok.
  });
});
