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

// Local imports.
const commands = require("./commands.js");
const downloader = require("./downloader.js");
const platforms = require("./platforms.js");
const apioLog = require("./apio-log.js");
const notice = require("./notice-view.js");
const utils = require("./utils.js");
const wizard = require("./get-example-wizard.js");
const tasks = require("./tasks.js");
const actions = require("./actions.js");
const envSelector = require("./env-selector.js");
const contextCmds = require("./context-cmds.js");
const shellCmd = require("./shell-cmd.js");
const demoCmd = require("./demo-cmd.js");

// // Place holder for the default apio env.
// const APIO_ENV_DEFAULT = "(default)";

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

Open your [existing Apio project](command:workbench.action.files.openFolder), \
or explore a temporary [Apio demo project](command:apio.demoProject).
`.trim();

// Convert an object to a dump string.
function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

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
        },
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
      const taskCmds =
        node.action?.cmds != null ? preCmds.concat(node.action.cmds) : null;

      // Optional text to show on successful completions of the commands.
      const taskCompletionMsgs = node.action?.completionMsgs;

      // Extract optional url. Null of doesn't exist.
      const urlToInvoke = node.action?.url;

      // Extract command id. Null if doesn't exit.
      const cmdIdToInvoke = node.action?.cmdId;

      // Construct the node title string
      taskTitle = nodeTitles.join(" / ").toUpperCase();

      // Register the callback to execute the action once selected.
      context.subscriptions.push(
        vscode.commands.registerCommand(
          node.id,
          actions.getActionLauncher(
            taskTitle,
            taskCmds,
            taskCompletionMsgs,
            urlToInvoke,
            cmdIdToInvoke,
          ),
        ),
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
          `Registering button ${node.id}, position ${node.btn.position}, priority ${priority}`,
        );
        const btn = vscode.window.createStatusBarItem(
          vscode.StatusBarAlignment.Left,
          priority,
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
        null,
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

// Register a tree view. Title is a string representing the tree
// view in the title path of the command tasks.
function _registerTreeView(context, tree, title, preCmds, viewId) {
  // Register the tree commands wit vscode.
  traverseAndRegisterCommands(context, tree, [title], preCmds);

  // Register three entries with its view.
  const viewContainer = vscode.window.registerTreeDataProvider(
    viewId,
    new ApioTreeProvider(tree),
  );
  context.subscriptions.push(viewContainer);
}

// Performs the dynamic configurations of the extension such as
// showing or hiding views and buttons. Calls once from activate()
// and then each time apio.ini changes.
function configure() {
  apioLog.msg("configure() called.");

  // Get the current state of the workspace.
  const wsInfo = utils.getWorkspaceInfo();
  apioLog.msg(`Workspace info: ${pretty(wsInfo)}`);

  // Export the flag apioIniExists to the vscode context.
  apioLog.msg(`Context: apio.projectDetected = ${wsInfo.apioIniExists}`);
  vscode.commands.executeCommand(
    "setContext",
    "apio.apioIniExists",
    wsInfo.apioIniExists,
  );

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
    wsInfo.apioIniExists,
  );

  // The TOOLS view is always enabled. We use the flag
  // initialized to show it only after it was initialized.
  vscode.commands.executeCommand(
    "setContext",
    "apio.sidebar.tools.enabled",
    true,
  );

  // The HELP view is always enabled. We use the flag
  // initialized to show it only after it was initialized.
  vscode.commands.executeCommand(
    "setContext",
    "apio.sidebar.help.enabled",
    true,
  );

  // Enable or disable the status bar elements in statusBarElements
  // depending if apio.ini currently exists.
  if (wsInfo.apioIniExists) {
    apioLog.msg("Showing apio status bar.");
    for (const element of statusBarElements) {
      element.show();
    }
    envSelector.show();
  } else {
    apioLog.msg("Hiding apio status bar.");
    for (const element of statusBarElements) {
      element.hide();
    }
    envSelector.hide();
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

  const activateFuncTiming = utils.timing("Activate() function");

  // Determine if the underlying host is supported. This depends on the
  // availability of platform_id in apio build releases.
  const platformId = platforms.getPlatformId();
  apioLog.msg(`Platform id: ${platformId}`);
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
  shellCmd.registerApioShellCommand(context, preCmds);

  // Register the demo project command
  demoCmd.registerDemoProjectCommand(context);

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
    const treeViewsTiming = utils.timing("Tree views registrations");

    _registerTreeView(
      context,
      commands.PROJECT_TREE,
      "PROJECT",
      preCmds,
      "apio.sidebar.project",
    );

    _registerTreeView(
      context,
      commands.TOOLS_TREE,
      "TOOLS",
      preCmds,
      "apio.sidebar.tools",
    );

    _registerTreeView(
      context,
      commands.HELP_TREE,
      "HELP",
      preCmds,
      "apio.sidebar.help",
    );

    treeViewsTiming.done();
  }

  // Construct the status bar 'Apio:' label
  {
    const apioLabel = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
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

  // Create and register the status bar apio env selector.
  envSelector.registerApioEnvSelector(context, wsInfo, 90);

  // Register the file context commands handlers.
  contextCmds.registerFileContextHandlers(context, preCmds);

  // Perform the dynamic configuration. This function is called
  // again latter each time apio.ini changes.
  configure();

  // Register the apio.ini watcher. This will trigger additional
  // calls to configure when apio.ini changes.
  if (wsInfo.wsDirPath) {
    registerApioIniWatcher(context, wsInfo.wsDirPath);
  }

  // Conditionally open apio.ini. This happens only if we just
  // created a new apio project from the get example wizard which temporarily
  // sets the apio.justCreatedProject flag.
  tasks.maybeOpenNewProject(context, wsInfo);

  // All done.
  activateFuncTiming.done();
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
    configure();
  }

  // Called when apio.ini changed.
  async function onApioIniChange() {
    apioLog.msg("onApioIniChange() called");
    configure();
  }

  // Called when apio.ini deleted.
  async function onApioIniDelete() {
    apioLog.msg("onApioIniDelete() called");
    configure();
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
