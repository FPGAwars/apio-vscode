// Handles the apio-shell command.

const vscode = require("vscode");
const path = require("path");

// Local imports
const downloader = require("./downloader.js");
const utils = require("./utils.js");

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
      (t) => t.name === TERMINAL_NAME,
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

// Export for require()
module.exports = {
  registerApioShellCommand,
};
