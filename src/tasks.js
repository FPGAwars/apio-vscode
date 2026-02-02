// Contains the execution of tasks using a temporary batch file.

// Standard imports
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

// Local imports.
const platforms = require("./platforms.js");
const apioLog = require("./apio-log.js");
const utils = require("./utils.js");

// A global vscode apio flag name to indicate to activate() to
// open apio.ini after creating a new project, e.g. demo or an
// apio example.
const JUST_CREATED_PROJECT_FLAG = "apio.justCreatedProject";

/**
 * Executes a list of shell commands sequentially using a single VS Code task.
 * Waits for completion and returns true if any command failed (non-zero exit code).
 *
 * @param {string[]} taskCmds - Array of shell commands to run one after another
 * @param {bool} preserveExitCode - if true, the batch file exists with an error code
 *   if any of its commands fails, otherwise it returns with zero despite the error.
 *   We use 'false' for regular apio commands to suppress the additional vscode
 *   task error banner
 * @returns {Promise<boolean>} true = failed or aborted → stop further actions, false = all succeeded
 */
async function execCommandsInATask(
  taskTitle,
  taskCmds,
  taskCompletionMsgs,
  preserveExitCode,
) {
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
  const okMessage = taskCompletionMsgs || ["Task completed successfully."];
  // For custom completion messages we use info color since we don't know
  // their nature. Could also add a style attribution to the action
  // specification in commands.js to provide more control.
  const okStyle = taskCompletionMsgs ? "INFO" : "OK";
  const failMessage = "Task failed.";
  const titleMessage = `${taskTitle}`;

  // The path to the apio bin so we can invoke 'apio api echo ...'.
  const apioBin = utils.apioBinaryPath();

  let shell;
  let shellArgs;
  if (platforms.isWindows()) {
    // Handle the case of Windows.
    const batchFile = path.join(utils.apioTmpDir(), "task.cmd");
    shell = "cmd.exe";
    shellArgs = ["/c", batchFile];
    // Construct the task batch file task.cmd.
    const cmdsLines = taskCmds.flatMap((cmd) => [
      " ",
      `echo $ ${cmd}`,
      `${cmd}`,
      `set "ERR=%errorlevel%"`,
      `if %ERR% neq 0 (`,
      `  echo.`,
      `  ${apioBin} api echo -t "${failMessage}" -s ERROR`,
      preserveExitCode ? `  exit /b %ERR%` : `  exit /b 0`,
      `)`,
    ]);
    const lines = [
      "@echo off",
      "setlocal",
      "verify >nul",
      `${apioBin} api echo -t "${titleMessage}" -s EMPH3`,
      `echo.`,
      ...cmdsLines,
      " ",
      `echo.`,
      // `echo ${okMessage}`,
      ...okMessage.map((s) => `${apioBin} api echo -t "${s}" -s ${okStyle}`),
      // ...okMessage.map((s) => makeGreenEcho(s, true)),
      "exit /b 0",
    ];
    utils.writeFileFromLines(batchFile, lines);
  } else {
    // Handle the case of macOS and Linux
    const batchFile = path.join(utils.apioTmpDir(), "task.bash");
    shell = "bash";
    shellArgs = [batchFile];
    // Construct the task batch file task.bash.
    //
    // Generate for each command.
    const cmdsLines = taskCmds.flatMap((cmd) => [
      " ",
      `echo '$ ${cmd}'`,
      `${cmd}`,
      `ERR=$?`,
      `if [ $ERR -ne 0 ]; then`,
      `  echo`,
      `  ${apioBin} api echo -t "${failMessage}" -s ERROR`,
      preserveExitCode ? `  exit $ERR` : `  exit 0`,
      `fi`,
    ]);
    // Combine all the lines.
    const lines = [
      "#!/usr/bin/env bash",
      `${apioBin} api echo -t "${titleMessage}" -s EMPH3`,
      "echo",
      ...cmdsLines,
      " ",
      "echo",
      // `echo "${okMessage}"`,
      ...okMessage.map((s) => `${apioBin} api echo -t "${s}" -s ${okStyle}`),
      // ...okMessage.map((s) => makeGreenEcho(s, false)),
      "exit 0",
    ];
    // Write to a file.
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
    new vscode.ShellExecution(shell, shellArgs),
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
        `[Apio Task] Finished with exit code ${e.exitCode ?? "unknown"}`,
      );

      resolve(failed);
    });
  });
}

// Conditionally open apio.ini. This happens only if we just
// created a new apio project from the get example wizard which temporarily
// sets the apio.justCreatedProject flag.
async function maybeOpenNewProject(context, wsInfo) {
  if (context.globalState.get(JUST_CREATED_PROJECT_FLAG)) {
    // Clear the global flag, regardless if we used it or not.
    context.globalState.update(JUST_CREATED_PROJECT_FLAG, undefined);

    if (wsInfo.apioIniExists) {
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
          },
        );
    }
  }
}

// Populate the given directory with given example and open the project
// with VSCode. If everything goes well, the function does not return as
// VSCode switches to the new workspace.
//
// 'board' and 'example' specify the example to use. 'folder' is the destination
// path and should be an absolute path and should not exist or be empty.
// 'callback' is calls on success and on failure with (ok:bool, text:str).
async function openProjectFromExample(
  context,
  board,
  example,
  folder,
  callback,
) {
  try {
    // Folder path should be absolute.
    if (!path.isAbsolute(folder)) {
      throw new Error(`Error: Folder is not an absolute path: ${folder}`);
    }

    // Use the absolute canonical form of the destination folder. On windows
    // for example, this include the drive letter c:\ even if the user
    // didn't specify it.
    folder = path.normalize(path.resolve(folder));

    // Folder should not exist or be empty.
    //
    // NOTE: Initially we used to delete the directory here before recreating
    // it below but this failed on windows if VS Code was already opened on the
    // apio demo project dir.
    if (fs.existsSync(folder) && fs.readdirSync(folder).length > 0) {
      throw new Error(`Directory must not exist or must be empty: ${folder}`);
    }

    // Create the destination folder if it doesn't exist. Does nothing if it
    // already exist..
    fs.mkdirSync(folder, { recursive: true });

    // Construct example full name.
    const exampleId = board + "/" + example;

    // Run 'apio examples fetch board/example' in the demo folder.
    const taskCmds = [
      `cd ${folder}`,
      `${utils.apioBinaryPath()} examples fetch ${exampleId}`,
    ];
    const aborted = await execCommandsInATask(
      `Create project`,
      taskCmds,
      ["Project created successfully, opening it..."], // taskCompletionMsgs
      true, // preserveExitCode
    );
    if (aborted) {
      throw Error("Failed to fetch example");
    }

    // Here when the example created ok, before we switch to the new project
    // call back with ok status to allow a brief success indication to the user.
    callback(true, "Success! Opening project.");

    // Uri of the new project's folder.
    const destinationUri = vscode.Uri.file(folder);

    // Brief wait to allow VS Code to detect newly created folder contents
    for (let i = 0; i < 10; i++) {
      try {
        const entries = await vscode.workspace.fs.readDirectory(destinationUri);
        if (entries.length > 0) {
          apioLog.msg(`New project folder is ready, attempts=${i + 1}`);
          break;
        }
      } catch {
        // silent - continue waiting
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    // Signal to the apio activate() that will be called on the new
    // workspace to automatically open apio.ini.
    await context.globalState.update("apio.justCreatedProject", true);

    // Determine if vscode will issue a workspace change or not.
    const isWsChange = utils.willCauseWorkspaceChange(destinationUri);
    apioLog.msg(`isWsChange = ${isWsChange}`);

    if (isWsChange) {
      // Open the demo project folder. This will cause a workspace switch
      // per the check above, and will invoke activate().
      await vscode.commands.executeCommand(
        "vscode.openFolder",
        destinationUri,
        { forceNewWindow: false, forceReuseWindow: true },
      );
    } else {
      // VSCode would not consider it as workspace change so reload the window to trigger
      // activate().
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }

    // Here when error.
  } catch (err) {
    callback(false, "Error: " + err.message);
  }
}

// Export for require()
module.exports = {
  execCommandsInATask,
  openProjectFromExample,
  maybeOpenNewProject,
};
