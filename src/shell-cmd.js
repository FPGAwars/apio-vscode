// Handles the apio-shell command.

const vscode = require("vscode");

// Local imports
const downloader = require("./downloader.js");
const utils = require("./utils.js");
const platforms = require("./platforms.js");
const apioLog = require("./apio-log.js");

/**
 * Registers the command "apio.shell"
 * - Kills every existing terminal named "Apio"
 * - Creates a brand-new one
 * - Executes the preCmds
 * - Leaves the terminal open for interactive use
 */
function registerApioShellCommand(context, wsInfo) {
  const TERMINAL_NAME = "Apio Shell";

  // Construct the shell startup commands.
  let preCmds = [];
  {
    if (platforms.isWindows()) {
      // For windows (CMD and Powershell)
      preCmds.push("cls");
      preCmds.push(`set "PATH=${utils.apioBinDir()};%PATH%"`);
      if (wsInfo.wsDirPath) preCmds.push(`cd "${wsInfo.wsDirPath}"`);
      preCmds.push("apio -h");
    } else {
      // For macOS and Linux (bash)
      preCmds.push("printf '\\ec'"); // cls
      preCmds.push(`export PATH="${utils.apioBinDir()}:$PATH"`);
      if (wsInfo.wsDirPath) preCmds.push(`cd "${wsInfo.wsDirPath}"`);
      preCmds.push("apio -h");
    }
    apioLog.msg(`Shell preCmds: ${preCmds}`);
  }

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

    // Create a brand-new terminal
    const terminal = vscode.window.createTerminal({ name: TERMINAL_NAME });

    // Make the terminal visible.
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
