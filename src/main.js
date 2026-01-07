// List of VSC builtin icons:
// https://code.visualstudio.com/api/references/icons-in-labels

// Online Javascript linter at: https://eslint.org/play/

// Microsoft docs for extension developers
// https://code.visualstudio.com/api

// Platformio extension repository
// https://github.com/platformio/platformio-vscode-ide

// To debug under VCS, have this file open and type F5 to open the test
// window. To restart the test window, type CMD-R in the test window.

// Extension icon.png source is from
// https://www.flaticon.com/free-icon/circuit_11732924
//
// Sidebar media/sidebar-icon.svg is from
// https://www.flaticon.com/free-icon/cpu_12653854

// Standard imports
const vscode = require("vscode");
const path = require("path");

// Local imports.
const commands = require("./commands.js");
const downloader = require("./downloader.js");
const platforms = require("./platforms.js");
const apioLog = require("./apio-log.js");
const notice = require("./notice-view.js");
const utils = require("./utils.js");
const wizard = require("./get-example-wizard.js");
const tasks = require("./tasks.js");

// Place holder for the default apio env.
const ENV_DEFAULT = "(default)";

// Parametric notice to show when the platform is not supported.
// Define once
const PLATFORM_NOT_SUPPORTED_NOTICE = (platformId) =>
  `#### Unsupported platform

The platform *${platformId}* is currently not supported. Please \
[file a feature request](https://github.com/fpgawars/apio/issues).
`.trim();

// Markdown notice to show when there is no open apio project.
const NO_APIO_PROJECT_NOTICE = `
#### No Apio project

[Open](command:workbench.action.files.openFolder) your existing Apio project, \
[play](command:apio.demoProject) with the Apio demo project, or \
[read](https://fpgawars.github.io/apio/docs/quick-start/#__tabbed_1_1) the Getting Started guide.
`.trim();

// Convert an object to a dump string.
function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

// For apio env selector.
let statusBarEnvSelector;
let currentEnv = ENV_DEFAULT;

// This is a summary of the config operation which is updated each time we reconfigure the
// extension. For now used for testing only.
let configSummary = {};

// List of visual element items. We keep them here so
// we can show/hide them as needed.
let statusBarElements = [];

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
 * Registers the command "apio.shell"
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
    // NOTE: Ideally we would like to have apioBinDir at the front but if we put it in
    // the front, VS Code moves it to the end, so we put it in the end for clarity.
    const newPath = process.env.PATH + path.delimiter + utils.apioBinDir();

    // Create brand-new terminal
    const terminal = vscode.window.createTerminal({
      name: TERMINAL_NAME,
      env: {
        ...process.env,
        // NOTE: We could pass here just apioBinDir() and vscode would prefix it
        // with the inherited base path but according to Grok it's safer this way
        // in case the terminal integration in vscode is disabled manually.
        PATH: newPath,
      },
    });

    terminal.show();

    // Make sure the apio binary exists. If not, download and install it.
    await downloader.ensureApioBinary();

    // Send pre-commands to the terminal
    for (const cmd of preCmds) {
      terminal.sendText(cmd);
    }
  });

  context.subscriptions.push(disposable);
}

/**
 * Registers the command "apio.demoProject"
 */
function registerDemoProjectCommand(context) {
  // Register the command handler.
  const disposable = vscode.commands.registerCommand(
    "apio.demoProject",
    async () => {
      // Make sure the apio binary exists. If not, download and install it.
      await downloader.ensureApioBinary();

      const demoDir = await utils.prepareEmptyApioDemoDir();

      // Get temp demo dir
      // const demoDir = utils.apioDemoDir();

      // Remove old demo dir, if exists.
      // await fs.promises
      //   .rm(demoDir, { recursive: true, force: true })
      //   .catch(() => {});

      // Action callback, throws an error if demo project creation failed.
      function callback(ok, text) {
        if (!ok) {
          throw Error(text);
        }
      }

      // Populate the demo directory with the given example and open it in VSCode.
      // Does not return if successful since VSCode leaves this workspace.
      await tasks.openProjectFromExample(
        context,
        "alhambra-ii",
        "getting-started",
        demoDir,
        callback
      );
    }
  );

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
// VSCode. Titles is an array with the title strings of the parents.
function traverseAndRegisterCommands(context, nodes, titles, preCmds) {
  // const result = [];
  for (const node of nodes) {
    nodeTitles = [...titles, node.title];
    if ("children" in node) {
      // Handle a group
      traverseAndRegisterCommands(context, node.children, nodeTitles, preCmds);
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

      // Optional text to show on successful completions of the commands.
      const completionMsgs = node.action?.completionMsgs;

      // Extract optional url. Null of doesn't exist.
      const url = node.action?.url;

      // Extract command id. Null if doesn't exit.
      const cmdId = node.action?.cmdId;

      // Construct the node title string
      nodeTitle = "🔹 " + nodeTitles.join(" ‣ ");

      // Register the callback to execute the action once selected.
      context.subscriptions.push(
        vscode.commands.registerCommand(
          node.id,
          actionLaunchWrapper(nodeTitle, cmds, url, cmdId, completionMsgs)
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
        statusBarElements.push(btn);
        // btn.show();
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
// Cmds include the pre commands but may contain placeholders that need
// to be expanded.
async function launchAction(title, cmds, url, cmdId, completionMsgs) {
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
    const aborted = await tasks.execCommandsInATask(
      title,
      cmds,
      false, // preserveExitCode
      completionMsgs
    );

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
function actionLaunchWrapper(title, cmds, url, cmdId, completionMsgs) {
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
      await launchAction(title, cmds, url, cmdId, completionMsgs);
    } catch (err) {
      console.error("[APIO] Failed to start the command:", err);
      vscode.window.showErrorMessage("Apio failed to launch the command.");
    }
  }

  return _launchWrapper;
}

// Update the display of the env selector.
function updateEnvSelector() {
  statusBarEnvSelector.text =
    currentEnv && currentEnv != ENV_DEFAULT
      ? `[env:${currentEnv}]`
      : ENV_DEFAULT;
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

// Register a tree view. Title is a string representing the tree
// view in the title path of the command tasks.
function _registerTreeView(context, tree, title, preCmds, viewId) {
  // Register the tree commands wit vscode.
  traverseAndRegisterCommands(context, tree, [title], preCmds);

  // Register three entries with its view.
  const viewContainer = vscode.window.registerTreeDataProvider(
    viewId,
    new ApioTreeProvider(tree)
  );
  context.subscriptions.push(viewContainer);
}

// Performs the dynamic configurations of the extension such as
// showing or hiding views and buttons. Calls once from activate()
// and then each time apio.ini changes.
function configure(context) {
  apioLog.msg("configure() called.");

  // Get the current state of the workspace.
  const wsInfo = utils.getWorkspaceInfo();
  apioLog.msg(`Workspace info: ${pretty(wsInfo)}`);

  // Conditionally open apio.ini. This happens only if we just
  // created a new apio project from the get example wizard which temporarily
  // sets the apio.justCreatedProject flag.
  if (
    wsInfo.apioIniExists &&
    context.globalState.get("apio.justCreatedProject")
  ) {
    // Open apio.ini in the editor.
    const apioIniUri = vscode.Uri.file(wsInfo.apioIniPath);
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

  // Clear the global flag, regardless if we used it or not.
  context.globalState.update("apio.justCreatedProject", undefined);

  // If apio project found then hide the notice view, else show
  // the no-project notice.
  if (wsInfo.apioIniExists) {
    notice.hide();
  } else {
    notice.showMarkdown(NO_APIO_PROJECT_NOTICE);
  }

  // If apio.ini exists then enable the PROJECT view, otherwise
  // disable it.
  vscode.commands.executeCommand(
    "setContext",
    "apio.sidebar.project.enabled",
    wsInfo.apioIniExists
  );

  // The TOOLS view is always enabled. We use the flag
  // initialized to show it only after it was initialized.
  vscode.commands.executeCommand(
    "setContext",
    "apio.sidebar.tools.enabled",
    true
  );

  // The HELP view is always enabled. We use the flag
  // initialized to show it only after it was initialized.
  vscode.commands.executeCommand(
    "setContext",
    "apio.sidebar.help.enabled",
    true
  );

  // Enable or disable the status bar elements in statusBarElements
  // depending if apio.ini currently exists.
  for (const element of statusBarElements) {
    if (wsInfo.apioIniExists) {
      apioLog.msg(`showing: ${typeof element}`);
      element.show();
    } else {
      apioLog.msg(`hiding: ${typeof element}`);
      element.hide();
    }
  }

  // Update the config summary
  configSummary = {
    noticeViewEnabled: !wsInfo.apioIniExists,
    projectViewEnabled: wsInfo.apioIniExists,
    toolsViewEnabled: true,
    helpViewEnabled: true,
    statusBarEnabled: wsInfo.apioIniExists,
  };

  // All done.
  apioLog.msg("configure() completed.");
}

// Standard VSC extension activate() function.
function activate(context) {
  // Init Apio log output channel.
  apioLog.init(context);
  apioLog.msg("activate() started.");

  // Determine if the underlying host is supported. This depends on the
  // availability of platform_id in apio build releases.
  const platformId = platforms.getPlatformId();
  if (!platforms.SUPPORTED_PLATFORMS_IDS.includes(platformId)) {
    apioLog.msg(`Platform not supported: ${platformId}`);
    notice.showMarkdown(PLATFORM_NOT_SUPPORTED_NOTICE(platformId));
    return;
  }

  // Where when the host is supported. Perform the one time
  // initialization of the extension.

  // Get the workspace info.
  const wsInfo = utils.getWorkspaceInfo();
  apioLog.msg(`Workspace info: ${pretty(wsInfo)}`);

  // Initialize the loader.
  downloader.init();

  // -- Register the get example wizard. We invoke it from
  // -- the 'get example' command after running 'apio api get-examples'
  // -- which generates a json file with the examples data.
  wizard.registerGetExampleWizard(context);

  // Compute the apio shell pre-commands. We don't set the PATH
  // because it's set later when invoking the terminal.
  let preCmds = [];
  {
    if (platforms.isWindows()) {
      // For windows (CMD and Powershell)
      preCmds.push("cls");
      if (wsInfo.wsDirPath) preCmds.push(`cd "${wsInfo.wsDirPath}"`);
      preCmds.push("apio -h");
    } else {
      // For macOS and Linux (bash)
      preCmds.push("printf '\\ec'");
      if (wsInfo.wsDirPath) preCmds.push(`cd "${wsInfo.wsDirPath}"`);
      preCmds.push("apio -h");
    }
    apioLog.msg(`Shell preCmds: ${preCmds}`);
  }

  // Register the shell command.
  registerApioShellCommand(context, preCmds);

  // Register the demo project command
  registerDemoProjectCommand(context);

  // Compute tasks pre-commands.
  preCmds = [];
  {
    if (platforms.isWindows()) {
      // Windows (cmd.exe)
      if (wsInfo.wsDirPath) {
        preCmds.push(`chdir /d "${wsInfo.wsDirPath}"`);
      }
    } else {
      // MacOS and Linux (bash)
      if (wsInfo.wsDirPath) {
        preCmds.push(`cd "${wsInfo.wsDirPath}"`);
      }
    }

    apioLog.msg(`Task preCmds: ${preCmds}`);
  }

  // Register the commands and the views from the command
  // trees definitions.
  {
    _registerTreeView(
      context,
      commands.PROJECT_TREE,
      "PROJECT",
      preCmds,
      "apio.sidebar.project"
    );

    _registerTreeView(
      context,
      commands.TOOLS_TREE,
      "TOOLS",
      preCmds,
      "apio.sidebar.tools"
    );

    _registerTreeView(
      context,
      commands.HELP_TREE,
      "HELP",
      preCmds,
      "apio.sidebar.help"
    );
  }

  // Construct the status bar 'Apio:' label
  {
    const apioLabel = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    apioLabel.text = "Apio:";
    apioLabel.tooltip = "Apio quick tools";
    context.subscriptions.push(apioLabel);
    statusBarElements.push(apioLabel);
    // apioLabel.show();
  }

  // Traverse the definition trees and register the status bar buttons.
  for (const tree of [
    commands.PROJECT_TREE,
    commands.TOOLS_TREE,
    commands.HELP_TREE,
  ]) {
    traverseAndRegisterTreeButtons(context, tree);
  }

  // Load saved env or use default "". This way we restore the user
  // selection from previous invocation of this workspace.
  currentEnv = context.workspaceState.get("apio.activeEnv") || "";

  // Create the apio env selection field.
  {
    statusBarEnvSelector = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      90
    );

    updateEnvSelector();

    statusBarEnvSelector.command = "apio.selectEnv";
    context.subscriptions.push(statusBarEnvSelector);
    statusBarElements.push(statusBarEnvSelector);

    // Register command: click → show QuickPick
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "apio.selectEnv",
        envSelectionClickHandler(context, wsInfo.apioIniPath)
      )
    );
  }

  // Perform the dynamic configuration. This function is called
  // again latter each time apio.ini changes.
  configure(context);

  // Register the apio.ini watcher. This will trigger additional
  // calls to configure when apio.ini changes.
  if (wsInfo.wsDirPath) {
    registerApioIniWatcher(context, wsInfo.wsDirPath);
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
    configure(context);
  }

  // Called when apio.ini changed.
  async function onApioIniChange() {
    apioLog.msg("onApioIniChange() called");
    configure(context);
  }

  // Called when apio.ini deleted.
  async function onApioIniDelete() {
    apioLog.msg("onApioIniDelete() called");
    configure(context);
  }

  watcher.onDidCreate(onApioIniCreate, context.subscriptions);
  watcher.onDidChange(onApioIniChange, context.subscriptions);
  watcher.onDidDelete(onApioIniDelete, context.subscriptions);

  context.subscriptions.push(watcher);
}

// Export for require()
module.exports = {
  // Standard extension exports.
  activate,
  deactivate,

  // Getters for testing
  getConfigSummary: () => configSummary,
};
