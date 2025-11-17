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

// Tree is a list of nodes.
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
        vscode.commands.registerCommand(
          node.id,
          getExecActionCallback(cmds, url)
        )
      );
    }
  }
}

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

// Function to write a message to the output channel 'Apio'. In the
// output tab, select 'Apio' to see it.
// function apioLog.msg(msg = "") {
//   outputChannel.appendLine(msg);
// }

// A function to execute an action. Action can have commands anr/or url.
function execAction(cmds, url, apioBinaryPath) {
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

// ---------------------------------------------------------------
// 2. WRAPPER: creates action *inside* after binary is ready
// ---------------------------------------------------------------
function getExecActionCallback(cmds, url) {
  return () => {
    downloader
      .ensureApioBinary()
      .then((apioBinaryPath) => {
        console.log(`[Apio] Binary ready: ${apioBinaryPath}`);

        // ← Action is created *here*, inside the wrapper
        // const run = execActionPrimitive(cmds, url)();
        // `run` is the actual function that opens terminal + sends commands
        // console.log("Calling execActionPrimitive");
        // run();
        execAction(cmds, url, apioBinaryPath);
        // console.log("Calling execActionPrimitive");
      })
      .catch((err) => {
        console.error("[Apio] Binary setup failed:", err);
        vscode.window.showErrorMessage("Apio binary failed to load.");
      });
  };
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

// Update the display of the env selector.
function updateEnvSelector() {
  statusBarEnv.text =
    currentEnv && currentEnv != ENV_DEFAULT
      ? `[env:${currentEnv}]`
      : ENV_DEFAULT;
  statusBarEnv.tooltip = "APIO: Select apio.ini env";
}

// Standard VSC extension activate() function.
function activate(context) {
  // Init Apio log output channel.
  apioLog.initLog(context);

  // outputChannel = vscode.window.createOutputChannel("Apio");
  // context.subscriptions.push(outputChannel);

  apioLog.msg("activate() started.");

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
  const apio_ini_path = path.join(apioFolder, "apio.ini");
  apioLog.msg(`apio_ini_path: ${apio_ini_path}`);

  // Do nothing if apio.ini doesn't exist. This is not an Apio workspace.
  if (!fs.existsSync(apio_ini_path)) {
    apioLog.msg(`apio.ini file not found at ${apio_ini_path}`);
    return;
  }
  apioLog.msg("apio.ini found");

  // Here we are committed to activate the extension.

  // apioLog.msg(`Platform id: ${platforms.getPlatformId()}`)

  apioLog.msg(`Platform id: ${platforms.getPlatformId()}`);
  apioLog.msg(`isWindows: ${platforms.isWindows()}`);
  apioLog.msg(`isLinux: ${platforms.isLinux()}`);
  apioLog.msg(`isDarwin: ${platforms.isDarwin()}`);

  // Init the downloader.
  downloader.init();

  // Process platform type.
  // const platform = process.platform;
  // apioLog.msg(`platform: ${platform}`);
  // isWindows = platform == "win32";
  // apioLog.msg(`is windows: ${isWindows}`);

  // Determines the commands that we prefix each apio command.
  const cd_cmd = platforms.isWindows()
    ? `chdir /d "${apioFolder}"`
    : `cd "${apioFolder}"`;
  apioLog.msg(`cd_cmd: ${cd_cmd}`);

  // Determine platform dependent command to clear the terminal.
  const clear_cmd = platforms.isWindows() ? "cls" : "clear";
  apioLog.msg(`clear_cmd: ${clear_cmd}`);

  const pre_cmds = [clear_cmd, cd_cmd];

  // Traverse the definition trees and register the commands.
  for (const tree of Object.values(commands.TREE_VIEWS)) {
    traverseAndRegisterCommands(context, pre_cmds, tree);
  }

  // Register the trees with their respective views.
  for (const [view_id, tree] of Object.entries(commands.TREE_VIEWS)) {
    // registerTreeView(context, view_id, tree);
    const viewContainer = vscode.window.registerTreeDataProvider(
      view_id,
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
    vscode.commands.registerCommand("apio.selectEnv", async () => {
      const envs = extractApioIniEnvs(apio_ini_path);
      envs.unshift(ENV_DEFAULT);
      const selected = await vscode.window.showQuickPick(envs, {
        placeHolder: "Select Apio environment",
      });

      if (selected !== undefined) {
        currentEnv = selected || ENV_DEFAULT;
        updateEnvSelector();
        await context.workspaceState.update("apio.activeEnv", currentEnv);
      }
    })
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
