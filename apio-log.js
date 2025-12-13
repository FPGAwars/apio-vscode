// apio-log.js
// Centralized logging for the Apio extension.


import * as vscode from "vscode";

let outputChannel = null;

// Initializes the Apio output channel and push it to the extension context.
// Must be called **once** from `activate(context)`.
// @param {vscode.ExtensionContext} context
export function init(context) {
  if (outputChannel) {
    return; // already initialized
  }

  outputChannel = vscode.window.createOutputChannel("Apio Extension");
  context.subscriptions.push(outputChannel);
}

// Append a message to the Apio output channel.
// @param {string} line Message to log
// @param {boolean} [show=false] If true, the channel is shown (preserves focus)
export function msg(line, show = false) {
  if (!outputChannel) {
    // Fallback: create a temporary channel if initLog was never called.
    // This should never happen in normal operation.
    outputChannel = vscode.window.createOutputChannel("Apio");
  }

  outputChannel.appendLine(line);

  if (show) {
    outputChannel.show(true); // true = preserve focus on the editor
  }
}

// Explicitly show the Apio output channel (preserves focus).
export function showChannel() {
  if (outputChannel) {
    outputChannel.show(true);
  }
}
