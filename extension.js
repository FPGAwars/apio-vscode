// List of VSC text icons at:
// https://code.visualstudio.com/api/references/icons-in-labels

// Online Javascript linter at: https://eslint.org/play/

// Microsoft docs for extension developers
// https://code.visualstudio.com/api

// Platformio extension repository
// https://github.com/platformio/platformio-vscode-ide

// To debug under VCS, have this file open and type F5 to open the test
// window. To restart the test window, type CMD-R in the test window.

"use strict";

// Imports
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

// Local imports.
const commands = require("./commands.js");
const downloader = require("./apio-downloader.js");
const platforms = require("./apio-platforms.js");
const apioLog = require("./apio-log.js");

// Place holder for the default apio env.
const ENV_DEFAULT = "(default)";

// Extension global context.
// let outputChannel = null;
let apioTerminal = null;

// For apio env selector.
let statusBarEnv;
let currentEnv = ENV_DEFAULT;

class ApioTreeItem extends vscode.TreeItem {
  constructor(label, tooltip, collapsibleState, command) {
    super(label, collapsibleState);
    this.tooltip = tooltip;
    this.command = command;
    this.iconPath = undefined; // no icon padding
    this.contextValue = command ? "command" : "group";
  }
}

class ApioTreeGroup {
  constructor(label, tooltip, children) {
    this.label = label;
    this.tooltip = tooltip;
    this.children = children;
  }
}

// Recursively traverse the definition tree and return it using
// datatypes that are expected by vscode. Nodes is a list of nodes.
function traverseAndConvertTree(nodes) {
  const result = [];
  for (const node of nodes) {
    if ("children" in node) {
      // Handle a group
      const children = traverseAndConvertTree(node.children);
      const item = new ApioTreeGroup(node.title, node.tooltip, children);
      result.push(item);
    } else {
      // Handle a leaf (command)
      const item = new ApioTreeItem(
        node.title,
        node.tooltip,
        vscode.TreeItemCollapsibleState.None,
        {
          command: node.id,
          title: node.title,
        }
      );
      result.push(item);
    }
  }

  return result;
}

// Recursively Traverse the tree nodes and register the commands with
// VSCode.
function traverseAndRegisterCommands(context, preCmds, nodes) {
  // const result = [];
  for (const node of nodes) {
    if ("children" in node) {
      // Handle a group
      traverseAndRegisterCommands(context, preCmds, node.children);
    } else {
      // Handle a leaf, it must have an action. If there are commands,
      // we prefix the pre_cmds, e.g. to cd to the project dir.
      // Note that we don't expand the -e env flag placeholder since the
      // user can select a different env by the time the action will be
      // selected.
      const cmds =
        node.action?.cmds != null ? preCmds.concat(node.action.cmds) : null;

      // Extract optional url. Null of doesn't exist.
      const url = node.action?.url;

      // Register the callback to execute the action once selected.
      context.subscriptions.push(
        vscode.commands.registerCommand(node.id, actionLaunchWrapper(cmds, url))
      );
    }
  }
}

// Recursively traverse the tree nodes and register the Apio
// buttons.
function traverseAndRegisterTreeButtons(context, nodesList) {
  for (const node of nodesList) {
    if ("children" in node) {
      // Handle a group
      traverseAndRegisterTreeButtons(context, node.children);
    } else {
      // Handle a leaf (command). It may or may not have a button
      // definitions.
      if ("btn" in node) {
        const priority = 100 - node.btn.position;
        apioLog.msg(
          `Registering button ${node.id}, position ${node.btn.position}, priority ${priority}`
        );
        const btn = vscode.window.createStatusBarItem(
          vscode.StatusBarAlignment.Left,
          priority
        );

        btn.command = node.id;
        btn.text = node.btn.icon;
        btn.tooltip = `APIO: ${node.tooltip}`;

        context.subscriptions.push(btn);
        btn.show();
      }
    }
  }
}

// An adapter between our tree format in commands.js and the
// one expected by VSCode.
class ApioTreeProvider {
  constructor(tree) {
    this.tree = tree;
  }

  getTreeItem(element) {
    if (element instanceof ApioTreeGroup) {
      return new ApioTreeItem(
        element.label,
        element.tooltip | "No group tooltip",
        vscode.TreeItemCollapsibleState.Collapsed,
        null
      );
    }
    return element;
  }

  getChildren(element) {
    if (!element) {
      return traverseAndConvertTree(this.tree);
    }

    // Inside a group: return children
    if (element instanceof ApioTreeGroup) {
      return element.children;
    }

    return [];
  }
}

// A function to execute an action. Action can have commands anr/or url.
function launchAction(cmds, url, apioBinaryPath) {
  // return () => {
  // If url is specified open it in the default browser.
  if (url != null) {
    vscode.env.openExternal(vscode.Uri.parse(url));
  }

  // If no commands in this action we are done.
  if (cmds == null) {
    return;
  }

  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) {
    vscode.window.showErrorMessage("No workspace open");
    return;
  }

  if (!apioTerminal || apioTerminal.exitStatus !== undefined) {
    apioTerminal?.dispose();

    // For windows we force cmd.exe shell. This is because we don't know yet how
    // to determine if vscode terminal uses cmd, bash, or powershell (configurable
    // by the user).
    let extraTerminalArgs = {};
    if (platforms.isWindows()) {
      extraTerminalArgs = {
        shellPath: "cmd.exe",
        shellArgs: ["/d"], // /d disables AutoRun; interactive shell does not require /c
      };
    }

    // Create the terminal, with optional args.
    apioTerminal = vscode.window.createTerminal({
      name: "Apio",
      cwd: ws.uri.fsPath,
      ...extraTerminalArgs,
    });
  }

  // Make the terminal visible, regardless if new or reused.
  apioTerminal.show();

  // Determine the optional --env value, based on selected env.
  let envFlag = "";
  if (currentEnv && currentEnv != ENV_DEFAULT) {
    envFlag = `-e ${currentEnv}`;
  }

  // Send the command lines to the terminal, resolving --env flag
  // placeholder if exists.
  for (let cmd of cmds) {
    cmd = cmd.replace("{apio-bin}", apioBinaryPath);
    cmd = cmd.replace("{env-flag}", envFlag);
    apioTerminal.sendText(cmd);
  }
  // };
}

// A wrapper that first download the apio binary if needed and
// only then invoked execAction
function actionLaunchWrapper(cmds, url) {
  // This wrapper is called when the user invokes the command. It
  // downloads and installs apio if needed and then executes
  // the command.
  async function _launchWrapper() {
    apioLog.msg("-----");
    
    // The path to the apio binary.
    let apioBinaryPath = null;

    // Make sure the apio binary exists. If not, download and install it.
    try {
      apioBinaryPath = await downloader.ensureApioBinary();
      console.log(`[Apio] Binary ready: ${apioBinaryPath}`);
    } catch (err) {
      console.error("[Apio] Binary setup failed:", err);
      vscode.window.showErrorMessage("Failed to install Apio.");
      return;
    }

    // Execute the command. Note that this is asynchronous such that
    // the execution of the commands may continues after this returns.
    try {
      launchAction(cmds, url, apioBinaryPath);
    } catch (err) {
      console.error("[APIO] Failed to start the command:", err);
      vscode.window.showErrorMessage("Apio failed to launch the command.");
    }
  }

  return _launchWrapper;
}

// Update the display of the env selector.
function updateEnvSelector() {
  statusBarEnv.text =
    currentEnv && currentEnv != ENV_DEFAULT
      ? `[env:${currentEnv}]`
      : ENV_DEFAULT;
  statusBarEnv.tooltip = "APIO: Select apio.ini env";
}

// Handle that is triggered when the user clicks on the env
// selection field in the status bar.
function envSelectionClickHandler(context, apioIniPath) {
  // The actual handler.
  async function _handler() {
    // Scan the apio.ini file and get a list of all of its envs.
    const envs = extractApioIniEnvs(apioIniPath);

    // Prepend to the list the (default) menu entry.
    envs.unshift(ENV_DEFAULT);

    // Ask the user to select from the list.
    let selected = await vscode.window.showQuickPick(envs, {
      placeHolder: "Select apio.ini environment",
    });

    if (selected !== undefined) {
      // Update the current env var with the selection.
      currentEnv = selected || ENV_DEFAULT;

      // Update the env field in the status bar.
      updateEnvSelector();

      // Persist the default for future invocations vscode and this project.
      await context.workspaceState.update("apio.activeEnv", currentEnv);
    }
  }

  return _handler;
}

// Scans apio.ini and return list of env names.
function extractApioIniEnvs(filePath) {
  // const fs = require("fs");
  try {
    const content = fs.readFileSync(filePath, "utf8");
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

// Standard VSC extension activate() function.
function activate(context) {
  // Init Apio log output channel.
  apioLog.init(context);

  apioLog.msg("activate() started.");

  // Check that we are on a supported platforms.
  const platformId = platforms.getPlatformId();
  if (!platforms.SUPPORTED_PLATFORMS_IDS.includes(platformId)) {
    apioLog.msg(
      `Platform id ${platformId} is not supported by this extension.`
    );
    return;
  }

  // Determine the workspace folder, do nothing if none.
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) {
    apioLog.msg("No workspace open");
    return;
  }

  // Determine the path of the expected apio project dir.
  const apioFolder = ws.uri.fsPath;
  apioLog.msg(`apio_folder: ${apioFolder}`);

  // Determine the path of the expected apio.ini file.
  const apioIniPath = path.join(apioFolder, "apio.ini");
  apioLog.msg(`apio_ini_path: ${apioIniPath}`);

  // Do nothing if apio.ini doesn't exist. This is not an Apio workspace.
  if (!fs.existsSync(apioIniPath)) {
    apioLog.msg(`apio.ini file not found at ${apioIniPath}`);
    return;
  }
  apioLog.msg("apio.ini found, activating the extension");

  // Here we are committed to activate the extension.

  apioLog.msg(`Platform id: ${platforms.getPlatformId()}`);
  apioLog.msg(`isWindows: ${platforms.isWindows()}`);
  apioLog.msg(`isLinux: ${platforms.isLinux()}`);
  apioLog.msg(`isDarwin: ${platforms.isDarwin()}`);

  // Init the downloader.
  downloader.init();

  // Determines the commands that we prefix each apio command.
  const changeDirCmd = platforms.isWindows()
    ? `chdir /d "${apioFolder}"`
    : `cd "${apioFolder}"`;
  apioLog.msg(`cd_cmd: ${changeDirCmd}`);

  // Determine platform dependent command to clear the terminal.
  const clearCommand = platforms.isWindows() ? "cls" : "clear";
  apioLog.msg(`clear_cmd: ${clearCommand}`);

  const preCmds = [clearCommand, changeDirCmd];

  // Traverse the definition trees and register the commands.
  for (const tree of Object.values(commands.TREE_VIEWS)) {
    traverseAndRegisterCommands(context, preCmds, tree);
  }

  // Register the trees with their respective views.
  for (const [viewId, tree] of Object.entries(commands.TREE_VIEWS)) {
    // registerTreeView(context, view_id, tree);
    const viewContainer = vscode.window.registerTreeDataProvider(
      viewId,
      new ApioTreeProvider(tree)
    );
    context.subscriptions.push(viewContainer);
  }

  // Construct the status bar 'Apio:' label
  const apioLabel = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  apioLabel.text = "Apio:";
  apioLabel.tooltip = "Apio quick tools";
  context.subscriptions.push(apioLabel);
  apioLabel.show();

  // Traverse the definition trees and register the status bar buttons.
  for (const tree of Object.values(commands.TREE_VIEWS)) {
    traverseAndRegisterTreeButtons(context, tree);
  }

  // Load saved env or use default ""
  currentEnv = context.workspaceState.get("apio.activeEnv") || "";

  // Create status bar item
  statusBarEnv = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    90
  );

  updateEnvSelector();

  statusBarEnv.command = "apio.selectEnv";
  statusBarEnv.show();
  context.subscriptions.push(statusBarEnv);

  // Register command: click → show QuickPick
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "apio.selectEnv",
      envSelectionClickHandler(context, apioIniPath)
    )
  );

  // All done.
  apioLog.msg("activate() completed.");
}

// deactivate() - required for cleanup
function deactivate() {
  if (apioTerminal) {
    apioTerminal.dispose();
    apioTerminal = null;
  }

  // TODO: Should we clear other global vars?
}

// Exported functions.
module.exports = { activate, deactivate };
