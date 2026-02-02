// Handles the apio-shell command.

const vscode = require("vscode");

// Local imports
const downloader = require("./downloader.js");
const utils = require("./utils.js");
const tasks = require("./tasks.js");

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

      // Populate the demo directory with the given example and open it in VSCode.
      // Does not return if successful since VSCode leaves this workspace.
      await tasks.openProjectFromExample(
        context,
        "alhambra-ii",
        "getting-started",
        demoDir,
        (callback = (ok, text) => {
          if (!ok) throw Error(text);
        }),
      );
    },
  );

  context.subscriptions.push(disposable);
}

// Export for require()
module.exports = {
  registerDemoProjectCommand,
};
