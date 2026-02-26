// Handles the apio-shell command.

const vscode = require("vscode");
const path = require("path");
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

  // Used for windows only.
  const cmdFilePath = path.join(utils.apioTmpDir(), "shell-init.cmd");
  const ps1FilePath = path.join(utils.apioTmpDir(), "shell-init.ps1");

  const disposable = vscode.commands.registerCommand("apio.shell", async () => {
    // if windows, create the shell initialization script for CMD and PS1.
    if (platforms.isWindows()) {
      const cmdLines = [
        ":: Automatically generated initialization VSCode 'apio shell'.",
        "@echo off",
        `echo Initializing for CMD`,
        `echo set "PATH=${utils.apioBinDir()};%%PATH%%"`,
        `set "PATH=${utils.apioBinDir()};%PATH%"`,
      ];
      utils.writeFileFromLines(cmdFilePath, cmdLines);

      const ps1Lines = [
        "# Automatically generated initialization for VSCode 'apio shell'",
        `Write-Host "Initializing for PowerShell"`,
        `Write-Host '$env:PATH = "${utils.apioBinDir()};$env:PATH"'`,
        `$env:PATH = "${utils.apioBinDir()};$env:PATH"`,
      ];
      utils.writeFileFromLines(ps1FilePath, ps1Lines);
    }


    // Construct commands to send to the terminal.
    wsDirExists = wsInfo.wsDirPath && fs.existsSync(wsInfo.wsDirPath);

    let preCmds = [];
    {
      if (platforms.isWindows()) {
        // For windows, CMD and PS1.
        preCmds.push("cls");
        // This select the cmd or ps1 startup init file.
        preCmds.push(`call "${cmdFilePath}" || . "${ps1FilePath}"`);
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

    // Create a brand-new terminal
    const terminal = vscode.window.createTerminal({
      name: TERMINAL_NAME,
      // This is just a safe initial cwd before .bashrc and shell and
      // preCmds overrides.
      cwd: utils.userHomeDir(),
    });

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
