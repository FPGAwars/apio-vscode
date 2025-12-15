// To run the test interactively in VS Code, run ./scripts/init-test-env.sh
// and use the extension ms-vscode.extension-test-runner to run the test
// interactively, with or without debug.

// const assert = require("assert");
const vscode = require("vscode");

// const BRIEF_DELAY_SECS = 3;
const BRIEF_DELAY_SECS = 3;

// Short delay to let the user view the results on the test
// vscode window.
async function briefDelay() {
  const delayMs = Math.trunc(1000 * BRIEF_DELAY_SECS);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

suite("Integration tests", () => {
  // Suite setup.
  suiteSetup(async function () {
    console.log("suiteSetup(): called");
    this.timeout(60000); // 60 secs timeout for the setup.
    await vscode.extensions.getExtension("fpgawars.apio").activate();
    await vscode.commands.executeCommand("apio.packagesUpdate");

    await briefDelay();
  });

  // Test 'apio version'. This is a basic command that doesn't use
  // the packages and does nothing.
  test("test-apio-version", async function () {
    console.log("test-apio-version test started");
    this.timeout(10000); // 5 secs timeout for this function.
    // Invoke the command.
    await vscode.commands.executeCommand("apio.version");
    // Brief delay so we can see the outout.
    await briefDelay();
  });

  // Test the demo-project function which creates a demo project.
  // test("test-demo-project", async function () {
  //   console.log("test-demo-project test started");

  //   this.timeout(10000); // 10 secs timeout for this function.

  //   // Invoke the command.
  //   await vscode.commands.executeCommand("apio.demoProject");

  //   // await briefDelay();
  // });
});
