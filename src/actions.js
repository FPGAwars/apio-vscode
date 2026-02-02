// Handle apio actions launching.

// Standard imports
const vscode = require("vscode");

// Local imports.
const constants = require("./constants.js");
const downloader = require("./downloader.js");
const tasks = require("./tasks.js");
const apioLog = require("./apio-log.js");
const utils = require("./utils.js");

// A function to execute an action. Action can have commands anr/or url.
// Cmds include the pre commands but may contain placeholders that need
// to be expanded.
async function _launchAction(
  currentApioEnv,
  taskTitle,
  taskCmds,
  taskCompletionMsgs,
  urlToOpen,
  cmdIdToInvoke,
) {
  // Handle the optional commands.
  if (taskCmds != null) {
    // Determine the value of the {env-flag} placeholder. It's derived
    // from the user's env selection at the status bar.
    let envFlag = "";
    if (currentApioEnv && currentApioEnv != constants.APIO_ENV_DEFAULT) {
      envFlag = `-e ${currentApioEnv}`;
    }

    // Expand the placeholders.
    taskCmds = taskCmds.map((cmd) => cmd.replace("{env-flag}", envFlag));
    taskCmds = taskCmds.map((cmd) =>
      cmd.replace("{apio-bin}", utils.apioBinaryPath()),
    );

    // Execute the commands and wait for completion.
    const aborted = await tasks.execCommandsInATask(
      taskTitle,
      taskCmds,
      taskCompletionMsgs,
      false, // preserveExitCode
    );

    if (aborted) {
      apioLog.msg("Terminal commands aborted or timeout.");
      return;
    }
  }

  // Handle url aspect of the action. Launch in a browser if exists.
  if (urlToOpen != null) {
    apioLog.msg(`Opening URL: ${urlToOpen}`);
    vscode.env.openExternal(vscode.Uri.parse(urlToOpen));
  }

  // Handle command id aspect of the action, if exists. This is
  // for example how we launch the get example wizard.
  if (cmdIdToInvoke) {
    apioLog.msg(`Launching command: ${cmdIdToInvoke}`);
    vscode.commands.executeCommand(cmdIdToInvoke);
  }
}

// A wrapper that first download the apio binary if needed and
// only then invoked execAction
function getActionLauncher(
  currentApioEnv,
  taskTitle,
  taskCmds,
  taskCompletionMsgs,
  urlToOpen,
  cmdIdToInvoke,
) {
  // This wrapper is called when the user invokes the command. It
  // downloads and installs apio if needed and then executes
  // the command.
  async function _launchWrapper() {
    apioLog.msg("-----");

    // Make sure the apio binary exists. If not, download and install it.
    await downloader.ensureApioBinary();

    // Execute the command. Note that this is asynchronous such that
    // the execution of the commands may continues after this returns.
    try {
      await _launchAction(
        currentApioEnv,
        taskTitle,
        taskCmds,
        taskCompletionMsgs,
        urlToOpen,
        cmdIdToInvoke,
      );
    } catch (err) {
      console.error("[APIO] Failed to start the command:", err);
      vscode.window.showErrorMessage("Apio failed to launch the command.");
    }
  }

  return _launchWrapper;
}

// Export for require()
module.exports = {
  getActionLauncher,
};
