// Handle apio actions launching.

// Standard imports
const vscode = require("vscode");

// Local imports.
const utils = require("./utils.js");

// Place holder for the default apio env. This is the value that
// is displayed to the user in the apio env selector to indicate
// 'use default apio env'.
const APIO_ENV_DEFAULT = "(default)";

let statusBarEnvSelector;
let currentApioEnv = APIO_ENV_DEFAULT;

// Update the display of the env selector.
function updateEnvSelector() {
  statusBarEnvSelector.text =
    currentApioEnv && currentApioEnv != APIO_ENV_DEFAULT
      ? `[env:${currentApioEnv}]`
      : APIO_ENV_DEFAULT;
  statusBarEnvSelector.tooltip = "APIO: Select apio.ini env";
}

// Handle that is triggered when the user clicks on the env
// selection field in the status bar.
function envSelectionClickHandler(context, apioIniPath) {
  // The actual handler.
  async function _handler() {
    // Scan the apio.ini file and get a list of all of its envs.
    const envs = utils.extractApioIniEnvs(apioIniPath);

    // Prepend to the list the (default) menu entry.
    envs.unshift(APIO_ENV_DEFAULT);

    // Ask the user to select from the list.
    let selected = await vscode.window.showQuickPick(envs, {
      placeHolder: "Select apio.ini environment",
    });

    if (selected !== undefined) {
      // Update the current env var with the selection.
      currentApioEnv = selected || APIO_ENV_DEFAULT;

      // Update the env field in the status bar.
      updateEnvSelector();

      // Persist the default for future invocations vscode and this project.
      await context.workspaceState.update("apio.activeEnv", currentApioEnv);
    }
  }

  return _handler;
}

// Create the apio env selection field and register it with the
// vscode context.
function registerApioEnvSelector(context, wsInfo, priority) {
  // Load saved env or use default "". This way we restore the user
  // selection from previous invocation of this workspace.
  currentApioEnv = context.workspaceState.get("apio.activeEnv") || "";

  statusBarEnvSelector = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    priority,
  );

  updateEnvSelector();

  statusBarEnvSelector.command = "apio.selectEnv";
  context.subscriptions.push(statusBarEnvSelector);
  // statusBarElements.push(statusBarEnvSelector);

  // Register command: click → show QuickPick
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "apio.selectEnv",
      envSelectionClickHandler(context, wsInfo.apioIniPath),
    ),
  );
}

// Returns the apio --env <env> flag or empty if using default env.
function getApioEnvFlag() {
  let envFlag = "";
  if (currentApioEnv && currentApioEnv != APIO_ENV_DEFAULT) {
    envFlag = `-e ${currentApioEnv}`;
  }
  return envFlag;
}

// Show the env selector in the status bar.
function show() {
  statusBarEnvSelector.show();
}

// Hide the env selector in the status bar.
function hide() {
  statusBarEnvSelector.hide();
}

// Export for require()
module.exports = {
  APIO_ENV_DEFAULT,
  registerApioEnvSelector,
  updateEnvSelector,
  getApioEnvFlag,
  show,
  hide,
};
