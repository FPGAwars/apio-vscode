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
const downloader = require("./downloader.js");
const platforms = require("./platforms.js");
const apioLog = require("./apio-log.js");
const notice = require("./notice-view.js");
const utils = require("./utils.js");
const wizard = require("./get-example-wizard.js");

// Place holder for the default apio env.
const ENV_DEFAULT = "(default)";

// Markdown notice to show when opening a folder that has no
// apio.ini project file.
const NO_APIO_INI_NOTICE = `
#### No Apio Project Detected

Apio project file \`apio.ini\` not detected in the workspace.

To create an Apio project click below on **TOOLS → examples → get example**
`.trim();

// Markdown notice to show when a VSCode workspace is not
// open.
const NO_WORKSPACE_NOTICE = `
#### No VS Code open workspace

To create an Apio project click below on **TOOLS → examples → get example**
`.trim();

// Parametric notice to show when the platform is not supported.
// Define once
const PLATFORM_NOT_SUPPORTED_NOTICE = (platformId) =>
  `
#### Unsupported platform

This Apio extension does not support the platform *${platformId}*
`.trim();

// Test if 'value' is in the list 'allowed'
function isOneOf(value, allowed) {
  return allowed.includes(value);
}

// Convert an object to a dump string.
function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

// Extension activation is one in one of these levels.
const Mode = Object.freeze({
  // Platform is not supported. Workspace may or may not be
  // open and it may or may not contain apio.ini.
  NOT_SUPPORTED: "not-supported-mode",
  // Platform is supported but no workspace open.
  NO_WORKSPACE: "no-workspace-mode",
  // Platform is supported, workspace is open, but there is
  // no apio.ini
  NO_PROJECT: "no-project-mode",
  // Platform is supported and a workspace is open and has
  // apio.ini in it.
  PROJECT: "project-mode",
});

// An immutable data object with activation info. If notice is not
// null, it's shown as markdown text in the NOTICE sidebar section.
const ActivationInfo = ({ mode, notice, wsDirPath, apioIniPath }) =>
  Object.freeze({ mode, notice, wsDirPath, apioIniPath });

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

/**
 * Registers the command "apio.apioTerminal"
 * - Kills every existing terminal named "Apio"
 * - Creates a brand-new one
 * - Executes the preCmds
 * - Leaves the terminal open for interactive use
 */
function registerApioShellCommand(context, preCmds) {
  const TERMINAL_NAME = "Apio Shell";

  const disposable = vscode.commands.registerCommand("apio.shell", async () => {
    // 1. Dispose ALL terminals named "Apio"
    const apioTerminals = vscode.window.terminals.filter(
      (t) => t.name === TERMINAL_NAME
    );
    for (const term of apioTerminals) {
      term.dispose();
    }

    // Small delay only if we actually disposed something
    // (prevents rare race condition where VS Code still thinks the terminal exists)
    if (apioTerminals.length > 0) {
      await new Promise((r) => setTimeout(r, 100));
    }

    // Construct the PATH of the shell, with apio bin in front.
    const newPath = `${utils.apioBinDir()}${path.delimiter}${
      process.env.PATH || ""
    }`;
    // const newPath2 = `${utils.apioBinDir()}${path.delimiter}${process.env.Path || ''}`;

    // 2. Create brand-new terminal
    const terminal = vscode.window.createTerminal({
      name: TERMINAL_NAME,
      // cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || undefined,
      env: {
        ...process.env,
        PATH: newPath,
        // Path: newPath
      },
    });

    terminal.show();

    // Make sure the apio binary exists. If not, download and install it.
    try {
      await downloader.ensureApioBinary();
      apioLog.msg(`[Apio] Binary ready: ${utils.apioBinaryPath()}`);
    } catch (err) {
      console.error("[Apio] Binary setup failed:", err);
      vscode.window.showErrorMessage("Failed to install Apio.");
      return;
    }

    // 3. Send pre-commands
    for (const cmd of preCmds) {
      terminal.sendText(cmd);
    }
  });

  context.subscriptions.push(disposable);
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
      // Handle a leaf. If it doesn't have an action, it means that its
      // command is a one-of that is implemented and registered independently.
      if (!("action" in node)) {
        continue;
      }
      // Here the leaf has a action. If there are commands,
      // we prefix the pre_cmds, e.g. to cd to the project dir.
      // Note that we don't expand the -e env flag placeholder since the
      // user can select a different env by the time the action will be
      // selected.
      const cmds =
        node.action?.cmds != null ? preCmds.concat(node.action.cmds) : null;

      // Extract optional url. Null of doesn't exist.
      const url = node.action?.url;

      // Extract command id. Null if doesn't exit.
      const cmdId = node.action?.cmdId;

      // Register the callback to execute the action once selected.
      context.subscriptions.push(
        vscode.commands.registerCommand(
          node.id,
          actionLaunchWrapper(cmds, url, cmdId)
        )
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

/**
 * Executes a list of shell commands sequentially using a single VS Code task.
 * Waits for completion and returns true if any command failed (non-zero exit code).
 *
 * @param {string[]} cmds - Array of shell commands to run one after another
 * @returns {Promise<boolean>} true = failed or aborted → stop further actions, false = all succeeded
 */
async function execCommandsInATask(cmds) {
  const taskName = "Apio Run";

  // 1. Kill any previous Apio task to avoid conflicts
  for (const exec of vscode.tasks.taskExecutions) {
    if (exec.task.name === taskName) {
      exec.terminate();
    }
  }

  // 2. Optional: clear terminal but keep the task title line
  if (vscode.window.activeTerminal?.name === taskName) {
    await vscode.commands.executeCommand("workbench.action.terminal.clear");
  }

  // 3. Create the batch file.
  const okMessage = "Task completed successfully.";
  const failMessage = "Task failed.";

  let shell;
  let shellArgs;
  if (platforms.isWindows()) {
    // Handle the case of Windows.
    const batchFile = path.join(utils.apioTmpDir(), "task.cmd");
    shell = "cmd.exe";
    shellArgs = ["/c", batchFile];
    // Construct the task batch file task.cmd.
    const wrappedCmds = cmds.flatMap((cmd) => [
      " ",
      `echo $ ${cmd}`,
      `${cmd}`,
      `set "ERR=%errorlevel%"`,
      `if %ERR% neq 0 (`,
      `  echo.`,
      `  echo ${failMessage}`,
      `  exit /b %ERR%`,
      `)`,
    ]);
    const lines = [
      "@echo off",
      "setlocal",
      "verify >nul",
      ...wrappedCmds,
      " ",
      `echo.`,
      `echo ${okMessage}`,
      "exit /b 0",
    ];
    utils.writeFileFromLines(batchFile, lines);
  } else {
    // Handle the case of macOS and Linux
    const batchFile = path.join(utils.apioTmpDir(), "task.bash");
    shell = "bash";
    shellArgs = [batchFile];
    // Construct the task batch file task.bash.
    const wrappedCmds = cmds.flatMap((cmd) => [
      " ",
      `echo '$ ${cmd}'`,
      `${cmd}`,
      `ERR=$?`,
      `if [ $ERR -ne 0 ]; then`,
      `  echo`,
      `  echo "${failMessage}"`,
      `  exit $ERR`,
      `fi`,
    ]);
    const lines = [
      "#!/usr/bin/env bash",
      ...wrappedCmds,
      " ",
      "echo",
      `echo "${okMessage}"`,
      "exit 0",
    ];
    utils.writeFileFromLines(batchFile, lines);
    try {
      fs.chmodSync(batchFile, 0o755);
    } catch {}
  }

  // 4. Build the task
  const task = new vscode.Task(
    { type: "shell" },
    vscode.TaskScope.Workspace,
    taskName,
    "apio",
    new vscode.ShellExecution(shell, shellArgs)
  );

  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Shared,
    showReuseMessage: false,
    focus: false,
    clear: false, // we cleared manually above
    echo: true,
  };

  // 5. Run the task and wait for the real exit code
  const execution = await vscode.tasks.executeTask(task);

  return new Promise((resolve) => {
    const listener = vscode.tasks.onDidEndTaskProcess((e) => {
      if (e.execution !== execution) return;

      listener.dispose();

      const failed = e.exitCode !== 0;
      apioLog.msg(
        `[Apio Task] Finished with exit code ${e.exitCode ?? "unknown"}`
      );

      resolve(failed);
    });
  });
}

// A function to execute an action. Action can have commands anr/or url.
// Cmds include the pre commands but may contain placeholders that need
// to be expanded.
async function launchAction(cmds, url, cmdId) {
  // Handle the optional commands.
  if (cmds != null) {
    // Determine the value of the {env-flag} placeholder. It's derived
    // from the user's env selection at the status bar.
    let envFlag = "";
    if (currentEnv && currentEnv != ENV_DEFAULT) {
      envFlag = `-e ${currentEnv}`;
    }

    // Expand the placeholders.
    cmds = cmds.map((cmd) => cmd.replace("{env-flag}", envFlag));
    cmds = cmds.map((cmd) => cmd.replace("{apio-bin}", utils.apioBinaryPath()));

    // Execute the commands and wait for completion.
    const aborted = await execCommandsInATask(cmds);
    if (aborted) {
      apioLog.msg("Terminal commands aborted or timeout.");
      return;
    }
  }

  // Handle url aspect of the action. Launch in a browser if exists.
  if (url != null) {
    apioLog.msg(`Opening URL: ${url}`);
    vscode.env.openExternal(vscode.Uri.parse(url));
  }

  // Handle command id aspect of the action, if exists. This is
  // for example how we launch the get example wizard.
  if (cmdId) {
    apioLog.msg(`Launching command: ${cmdId}`);
    vscode.commands.executeCommand(cmdId);
  }
}

// A wrapper that first download the apio binary if needed and
// only then invoked execAction
function actionLaunchWrapper(cmds, url, cmdId) {
  // This wrapper is called when the user invokes the command. It
  // downloads and installs apio if needed and then executes
  // the command.
  async function _launchWrapper() {
    apioLog.msg("-----");

    // Make sure the apio binary exists. If not, download and install it.
    try {
      await downloader.ensureApioBinary();
      apioLog.msg(`[Apio] Binary ready: ${utils.apioBinaryPath()}`);
    } catch (err) {
      console.error("[Apio] Binary setup failed:", err);
      vscode.window.showErrorMessage("Failed to install Apio.");
      return;
    }

    // Execute the command. Note that this is asynchronous such that
    // the execution of the commands may continues after this returns.
    try {
      await launchAction(cmds, url, cmdId);
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
    const envs = utils.extractApioIniEnvs(apioIniPath);

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

// Called from activate() to determine the activation mode to perform.
// Returns an ActivationInfo object with the activation params.
function _determineActivationInfo() {
  // If platform is not supported then mode = NOT_SUPPORTED.
  const platformId = platforms.getPlatformId();
  if (!platforms.SUPPORTED_PLATFORMS_IDS.includes(platformId)) {
    return ActivationInfo({
      mode: Mode.NOT_SUPPORTED,
      notice: PLATFORM_NOT_SUPPORTED_NOTICE(platformId),
      wsDirPath: null,
      apioIniPath: null,
    });
  }

  // If workspace is not opened then mode = NO_WORKSPACE
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) {
    return ActivationInfo({
      mode: Mode.NO_WORKSPACE,
      notice: NO_WORKSPACE_NOTICE,
      wsDirPath: null,
      apioIniPath: null,
    });
  }

  // Here the platform is supported and workspace is open.

  // Determine the path of the expected apio project dir.
  let wsDirPath = ws.uri.fsPath;
  apioLog.msg(`original wsFolderPath: ${wsDirPath}`);

  wsDirPath = path.resolve(wsDirPath);
  apioLog.msg(`canonical wsFolderPath: ${wsDirPath}`);

  // Determine the path of the expected apio.ini file.
  const apioIniPath = path.join(wsDirPath, "apio.ini");
  apioLog.msg(`apio_ini_path: ${apioIniPath}`);

  // If apio.ini doesn't exist then mode = NO_PROJECT. Note that
  // we set apioIniPath even though apio.ini doesn't exist because
  // we want to watch that path in case the user will create it.
  if (!fs.existsSync(apioIniPath)) {
    return ActivationInfo({
      mode: Mode.NO_PROJECT,
      notice: NO_APIO_INI_NOTICE,
      wsDirPath: wsDirPath,
      apioIniPath: apioIniPath,
    });
  }

  // Here when the platform is supported, a workspace is open, and
  // it contains apio.ini.
  return ActivationInfo({
    mode: Mode.PROJECT,
    notice: null, // No notice
    wsDirPath: wsDirPath,
    apioIniPath: apioIniPath,
  });
}

// Register a tree view.
function _registerTreeView(context, preCmds, tree, viewId, viewEnableFlag) {
  traverseAndRegisterCommands(context, preCmds, tree);

  if (viewEnableFlag) {
    vscode.commands.executeCommand("setContext", viewEnableFlag, true);
  }

  // Register the trees with their respective views.
  // for (const [viewId, tree] of Object.entries(commands.TREE_VIEWS)) {
  // registerTreeView(context, view_id, tree);
  const viewContainer = vscode.window.registerTreeDataProvider(
    viewId,
    new ApioTreeProvider(tree)
  );
  context.subscriptions.push(viewContainer);
}

// Standard VSC extension activate() function.
function activate(context) {
  // Init Apio log output channel.
  apioLog.init(context);
  apioLog.msg("activate() started.");

  // Determine activation info.
  const info = _determineActivationInfo();
  apioLog.msg(`Activation Info: ${pretty(info)}`);
  const mode = info.mode;

  // Conditionally initialize the apio downloader
  if (isOneOf(mode, [Mode.NO_WORKSPACE, Mode.NO_PROJECT, Mode.PROJECT])) {
    downloader.init();
  }

  // Conditionally open apio.ini. This happens only if we just
  // created a new apio project from the get example wizard which temporarily
  // sets the apio.justCreatedProject flag.
  if (
    isOneOf(mode, Mode.PROJECT) &&
    context.globalState.get("apio.justCreatedProject")
  ) {
    // Clear the flag immediately
    context.globalState.update("apio.justCreatedProject", undefined);

    // Open apio.ini in the editor.
    const apioIniUri = vscode.Uri.file(info.apioIniPath);
    vscode.window
      .showTextDocument(apioIniUri, {
        viewColumn: vscode.ViewColumn.Active,
        preview: false,
        preserveFocus: false,
      })
      .then(
        () => {
          apioLog.msg("New project, apio.ini opened automatically");
        },
        (err) => {
          apioLog.msg(`Failed to open apio.ini: ${err}`);
        }
      );
  }

  // -- Register the get example wizard. We invoke it from
  // -- the 'get example' command after running 'apio api get-examples ...'
  // -- to generate a json file with the examples data.
  if (isOneOf(mode, [Mode.NO_WORKSPACE, Mode.NO_PROJECT, Mode.PROJECT])) {
    wizard.registerGetExampleWizard(context);
  }

  // -- Conditionally register the apio shell command.
  if (isOneOf(mode, [Mode.NO_WORKSPACE, Mode.NO_PROJECT, Mode.PROJECT])) {
    // Determine the shell pre commands. The PATH is set later
    // when we create the terminal.
    let cmds = [];
    if (platforms.isWindows()) {
      // For windows (CMD and Powershell)
      cmds.push("cls");
      if (info.wsDirPath) cmds.push(`cd "${info.wsDirPath}"`);
      cmds.push("apio -h");
    } else {
      // For macOS and Linux (bash)
      cmds.push("printf '\\ec'");
      if (info.wsDirPath) cmds.push(`cd "${info.wsDirPath}"`);
      cmds.push("apio -h");
    }
    // Register the shell command.
    registerApioShellCommand(context, cmds);
  }

  // -- Determine the tasks pre commands

  let preCmds = null;
  if (isOneOf(mode, [Mode.NO_WORKSPACE, Mode.NO_PROJECT, Mode.PROJECT])) {
    preCmds = [];

    if (platforms.isWindows()) {
      // Windows (cmd.exe)
      if (info.wsDirPath) {
        preCmds.push(`chdir /d "${info.wsDirPath}"`);
      }
    } else {
      // MacOS and Linux (bash)
      if (info.wsDirPath) {
        preCmds.push(`cd "${info.wsDirPath}"`);
      }
    }

    apioLog.msg(`preCmds: ${preCmds}`);
  }

  // --- Conditionally enable the NOTICE view
  if (info.notice) {
    notice.showMarkdown(info.notice);
  }

  // --- Conditionally enable the PROJECT view.
  if (isOneOf(mode, [Mode.PROJECT])) {
    _registerTreeView(
      context,
      preCmds,
      commands.PROJECT_TREE,
      "apio.sidebar.project",
      "apio.sidebar.project.enabled"
    );
  }

  // --- Conditionally enable the TOOLS view.

  if (isOneOf(mode, [Mode.NO_WORKSPACE, Mode.NO_PROJECT, Mode.PROJECT])) {
    _registerTreeView(
      context,
      preCmds,
      commands.TOOLS_TREE,
      "apio.sidebar.tools",
      "apio.sidebar.tools.enabled"
    );
  }

  // --- Unconditionally enable the HELP view.

  _registerTreeView(
    context,
    preCmds,
    commands.HELP_TREE,
    "apio.sidebar.help",
    "apio.sidebar.help.enabled"
  );

  // --- Conditionally enable the status bar icons

  if (isOneOf(mode, [Mode.PROJECT])) {
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
    for (const tree of [
      commands.PROJECT_TREE,
      commands.TOOLS_TREE,
      commands.HELP_TREE,
    ]) {
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
        envSelectionClickHandler(context, info.apioIniPath)
      )
    );
  }

  // If the workspace is open, register an apio.ini watcher so
  // we can change the extension configuration to adapt to apio.ini
  // addition/deletion/change.
  if (isOneOf(mode, [Mode.NO_PROJECT, Mode.PROJECT])) {
    registerApioIniWatcher(context, info.wsDirPath);
  }

  // All done.
  apioLog.msg("activate() completed.");
}

// deactivate() - required for cleanup
function deactivate() {
  // Nothing to do here.
}

// Register a watcher for apio.ini addition/deletion/change. Called
// only if the workspace is open.
function registerApioIniWatcher(context, wsDirPath) {
  // The pattern of the apio.ini file.
  const globPattern = new vscode.RelativePattern(wsDirPath, "apio.ini");

  // The apio.ini watcher.
  const watcher = vscode.workspace.createFileSystemWatcher(globPattern);

  // Called when apio.ini created.
  async function onApioIniCreate() {
    apioLog.msg("onApioIniCreate() called");
    await vscode.commands.executeCommand('workbench.action.restartExtensionHost');
  }

  // Called when apio.ini changed.
  async function onApioIniChange() {
    apioLog.msg("onApioIniChange() called");
    await vscode.commands.executeCommand('workbench.action.restartExtensionHost');
  }

  // Called when apio.ini deleted.
  async function onApioIniDelete() {
    apioLog.msg("onApioIniDelete() called");
    await vscode.commands.executeCommand('workbench.action.restartExtensionHost');
  }

  watcher.onDidCreate(onApioIniCreate, context.subscriptions);
  watcher.onDidChange(onApioIniChange, context.subscriptions);
  watcher.onDidDelete(onApioIniDelete, context.subscriptions);

  context.subscriptions.push(watcher);
}

// Exported functions.
module.exports = { activate, deactivate };
