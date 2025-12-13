// Contains the execution of tasks using a temporary batch file.

// Imports
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

// Local imports.
import * as platforms from "./platforms.js";
import * as apioLog from "./apio-log.js";
import * as utils from "./utils.js";

/**
 * Executes a list of shell commands sequentially using a single VS Code task.
 * Waits for completion and returns true if any command failed (non-zero exit code).
 *
 * @param {string[]} cmds - Array of shell commands to run one after another
 * @returns {Promise<boolean>} true = failed or aborted → stop further actions, false = all succeeded
 */
export async function execCommandsInATask(cmds) {
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
  const okMessage = "Task completed successfully.";
  const failMessage = "Task failed.";

  let shell;
  let shellArgs;
  if (platforms.isWindows()) {
    // Handle the case of Windows.
    const batchFile = path.join(utils.apioTmpDir(), "task.cmd");
    shell = "cmd.exe";
    shellArgs = ["/c", batchFile];
    // Construct the task batch file task.cmd.
    const wrappedCmds = cmds.flatMap((cmd) => [
      " ",
      `echo $ ${cmd}`,
      `${cmd}`,
      `set "ERR=%errorlevel%"`,
      `if %ERR% neq 0 (`,
      `  echo.`,
      `  echo ${failMessage}`,
      // Experimental: suppress the vscode additional error message by
      // exiting with 0. Grok advises against doing it. We could pass in
      // a 'preserveErrors boolean flag.
      // `  exit /b %ERR%`,
      `  exit /b 0`,
      `)`,
    ]);
    const lines = [
      "@echo off",
      "setlocal",
      "verify >nul",
      ...wrappedCmds,
      " ",
      `echo.`,
      `echo ${okMessage}`,
      "exit /b 0",
    ];
    utils.writeFileFromLines(batchFile, lines);
  } else {
    // Handle the case of macOS and Linux
    const batchFile = path.join(utils.apioTmpDir(), "task.bash");
    shell = "bash";
    shellArgs = [batchFile];
    // Construct the task batch file task.bash.
    const wrappedCmds = cmds.flatMap((cmd) => [
      " ",
      `echo '$ ${cmd}'`,
      `${cmd}`,
      `ERR=$?`,
      `if [ $ERR -ne 0 ]; then`,
      `  echo`,
      `  echo "${failMessage}"`,
      // Experimental: suppress the vscode additional error message by
      // exiting with 0. Grok advises against doing it. We could pass in
      // a 'preserveErrors boolean flag.
      // `  exit $ERR`,
      `  exit 0`,
      `fi`,
    ]);
    const lines = [
      "#!/usr/bin/env bash",
      ...wrappedCmds,
      " ",
      "echo",
      `echo "${okMessage}"`,
      "exit 0",
    ];
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
    new vscode.ShellExecution(shell, shellArgs)
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
        `[Apio Task] Finished with exit code ${e.exitCode ?? "unknown"}`
      );

      resolve(failed);
    });
  });
}

// Populate the given directory with given example and open the project
// with VSCode. If everything goes well, the function does not return as
// VSCode switches to the new workspace.
//
// 'board' and 'example' specify the example to use. 'folder' is the destination
// path. It should not exist and should be an absolute path. 'callback' is
// calls on success and on failure with (ok:bool, text:str).
export async function openProjectFromExample(
  context,
  board,
  example,
  folder,
  callback
) {
  try {
    // Folder path should be absolute.
    if (!path.isAbsolute(folder)) {
      throw new Error(`Error: Folder is not an absolute path: ${folder}`);
    }

    // Use the absolute canonical form of the destination folder. On windows
    // for example, this include the drive letter c:\ even if the user
    // didn't specify it.
    folder = path.resolve(folder);

    // Folder should not exist.
    if (fs.existsSync(folder)) {
      throw new Error("Directory already exists: " + folder);
    }

    // Construct example full name.
    const exampleId = board + "/" + example;

    // Create the destination folder.
    fs.mkdirSync(folder, { recursive: true });

    // Run 'apio examples fetch board/example' in the demo folder.
    const aborted = await execCommandsInATask([
      `cd ${folder}`,
      `${utils.apioBinaryPath()} examples fetch ${exampleId}`,
    ]);
    if (aborted) {
      throw Error("Failed to fetch example");
    }

    // Here when the example created ok, before we switch to the new project
    // call back with ok status to allow a brief success indication to the user.
    callback(true, "Success! Opening project.");

    // Signal to the apio activate() that will be called on the new
    // workspace to automatically open apio.ini.
    await context.globalState.update("apio.justCreatedProject", true);

    // Switch to the new workspace. This will start a new instance of
    // this extension.
    setTimeout(async () => {
      // Determine if the demo project is already the current workspace,
      // in case we run the 'demo project' command while a demo project
      // is already open.
      const wsInfo = utils.getWorkspaceInfo();

      const sameFolder =
        wsInfo.wsDirPath &&
        path.resolve(folder) == path.resolve(wsInfo.wsDirPath);

      if (sameFolder) {
        // Current and destination workspace folders are the same one, simply
        // reload the current workspace to invoke activate()
        await vscode.commands.executeCommand("workbench.action.reloadWindow");
      } else {
        // Here when the current workspace is not the demo folder so we switch
        // to the demo folder. Doing so when the folders are the same results
        // in awkward user experience because activate() is no invoked.
        await vscode.commands.executeCommand(
          "vscode.openFolder",
          vscode.Uri.file(folder),
          { forceNewWindow: false, forceReuseWindow: true }
        );
      }
    }, 1200);

    // Here when error.
  } catch (err) {
    callback(false, "Error: " + err.message);
  }
}
