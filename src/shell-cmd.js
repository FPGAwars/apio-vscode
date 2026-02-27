// Handles the apio-shell command.

const vscode = require("vscode");
const fs = require("fs");

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

  const disposable = vscode.commands.registerCommand("apio.shell", async () => {
    // Construct commands to send to the terminal.
    wsDirExists = wsInfo.wsDirPath && fs.existsSync(wsInfo.wsDirPath);

    let preCmds = [];
    {
      if (platforms.isWindows()) {
        // For windows, (no Powershell, we force CMD below.).
        preCmds.push("cls");
        preCmds.push(`set "PATH=${utils.apioBinDir()};%PATH%"`);
        if (wsDirExists) preCmds.push(`cd "${wsInfo.wsDirPath}"`);
        preCmds.push("apio -h");
      } else {
        // For macOS and Linux (bash)
        preCmds.push("printf '\\ec'"); // cls
        preCmds.push(`export PATH="${utils.apioBinDir()}:$PATH"`);
        if (wsDirExists) preCmds.push(`cd "${wsInfo.wsDirPath}"`);
        preCmds.push("apio -h");
      }
      apioLog.msg(`Shell preCmds: ${preCmds}`);
    }

    // Dispose ALL terminals named "Apio"
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

    // Determine terminal options.
    let terminalOptions = {
      name: TERMINAL_NAME,
      // This is just a safe initial cwd before .bashrc and shell and
      // preCmds overrides
      cwd: utils.userHomeDir(),
    };

    if (platforms.isWindows()) {
      // On windows we force CMD shell. Allowing also PowerShell got us
      // into dead end because there is no common set PATH command
      // for CMD and PowerShell and PowerShell by default doesn't
      // allow to run scripts we generate.
      terminalOptions.shellPath = "cmd.exe";
    }

    // Create the terminal and make it visible.
    const terminal = vscode.window.createTerminal(terminalOptions);
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
