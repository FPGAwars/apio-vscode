// Handle the context commands. This are commands that are
// launched from right-click menus.

// Standard imports
const vscode = require("vscode");

// Local imports.
const apioLog = require("./apio-log.js");
const actions = require("./actions.js");

// A callback for handling commands invocations from vscode context
// right click menu.
async function contextCmdHandler(taskTitle, taskCmds, contextUri) {
  let targetUri;

  apioLog.msg("fileContextHandler() invoked");
  apioLog.msg(`contextUri=${contextUri}`);

  // Determine the target URI.
  if (contextUri instanceof vscode.Uri) {
    // We got the uri from the explorer.
    targetUri = contextUri;
  } else {
    // Otherwise, the invocation from the editor editor.
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      targetUri = activeEditor.document.uri;
    }
  }

  // Error if we didn't figure out the.
  if (!targetUri) {
    vscode.window.showWarningMessage("No file selected or no active editor.");
    return;
  }

  // Convert the uri to a path relative to the workspace.
  const contextPath = vscode.workspace.asRelativePath(targetUri);

  // Expand the {context-path} placeholder in the task title and
  // in the commands.
  taskTitle = taskTitle.replace("{context-path}", contextPath);
  taskCmds = taskCmds.map((cmd) => cmd.replace("{context-path}", contextPath));

  // Launch the commands as a task.
  launcher = actions.getActionLauncher(
    (taskTitle = taskTitle),
    (taskCmds = taskCmds),
    (taskCompletionMsgs = null),
    (urlToOpen = null),
    (cmdIdToInvoke = null),
  );

  await launcher();
}

// Register the handlers for the file context operations
function registerFileContextHandlers(context, preCmds) {
  // Per context command cmdId, taskTitle, and taskCmds.
  const contextCmds = [
    [
      "apio.context.sim",
      "Context / sim",
      [...preCmds, `{apio-bin} sim "{context-path}" {env-flag}`],
    ],
    [
      "apio.context.test",
      "Context / test",
      [...preCmds, `{apio-bin} test "{context-path}" {env-flag}`],
    ],
    [
      "apio.context.lint",
      "Context / lint",
      [...preCmds, `{apio-bin} lint "{context-path}" {env-flag}`],
    ],
    [
      "apio.context.format",
      "Context / format",
      [...preCmds, `{apio-bin} format "{context-path}" {env-flag}`],
    ],
  ];

  for (const [cmdId, taskTitle, taskCmds] of contextCmds) {
    context.subscriptions.push(
      vscode.commands.registerCommand(cmdId, (contextUri) =>
        contextCmdHandler(taskTitle, taskCmds, contextUri),
      ),
    );
  }
}

// Export for require()
module.exports = {
  registerFileContextHandlers,
};
