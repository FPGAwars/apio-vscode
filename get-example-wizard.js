// Implements the 'get example' command wizard.

"use strict";

const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const cp = require("child_process");

const utils = require("./utils.js");

// Load the examples json data from apio. Before invoking this
// wizard we run 'apio api get-examples -o <output-file>'.
function loadApioExamplesData() {
  const filePath = utils.apioTmpFile("examples.json");
  const rawContent = fs.readFileSync(filePath, "utf-8");

  let data;

  try {
    data = JSON.parse(rawContent);
  } catch (err) {
    throw new Error(`Failed to load examples from ${filePath}: ${err.message}`);
  }

  return data; // ← now result is in scope and has value
}

function registerGetExampleWizard(context) {
  const commandId = "apio.newProjectWizard";

  const disposable = vscode.commands.registerCommand(commandId, () => {
    showWizard(context);
  });

  context.subscriptions.push(disposable);
}

function showWizard(context) {
  const panel = vscode.window.createWebviewPanel(
    "apioWizard",
    "Apio – New Project",
    vscode.ViewColumn.Active,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  panel.webview.html = getWebviewContent();

  panel.webview.onDidReceiveMessage((msg) => {
    if (msg.command === "createProject") {
      createProject(context, msg, panel);
    }
  });
}

function getWebviewContent() {
  const examplesData = loadApioExamplesData();
  const boards = Object.keys(examplesData.examples).sort();

  let boardOptions = "";
  for (let i = 0; i < boards.length; i++) {
    const b = boards[i];
    const cnt = Object.keys(examplesData.examples[b]).length;
    const s = cnt === 1 ? "" : "s";
    boardOptions +=
      '<option value="' +
      b +
      '">' +
      b +
      " (" +
      cnt +
      " example" +
      s +
      ")</option>";
  }

  return (
    "<!DOCTYPE html>\n" +
    '<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>Apio – New Project</title>" +
    "<style>" +
    "body{font-family:var(--vscode-font-family,sans-serif);font-size:var(--vscode-editor-font-size,14px);padding:2rem;background:var(--vscode-editor-background);color:var(--vscode-editor-foreground);line-height:1.6;margin:0}" +
    "h1{margin-bottom:1.5rem;border-bottom:1px solid var(--vscode-editorWidget-border);padding-bottom:.5rem}" +
    "label{display:block;margin:2rem 0 .7rem;font-weight:650;font-size:1.08rem;color:var(--vscode-foreground)}" +
    "select,input{width:100%;padding:.8rem;font-size:1rem;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:4px;box-sizing:border-box}" +
    ".description{font-size:.9rem;color:var(--vscode-descriptionForeground);margin-top:.4rem;font-style:italic;min-height:1.2em}" +
    ".instruction{font-size:.95rem;color:var(--vscode-descriptionForeground);margin:1.5rem 0 2rem;line-height:1.6}" +
    "button{margin-top:2.8rem;padding:.9rem 2rem;font-size:1.1rem;background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:4px;cursor:pointer}" +
    "button:hover{background:var(--vscode-button-hoverBackground)}button:disabled{opacity:.6;cursor:not-allowed}" +
    ".status{margin-top:1.5rem;padding:1rem;border-radius:4px;font-weight:500}" +
    ".status.success{background:#28a745;color:white}" +
    ".status.error{background:var(--vscode-inputValidation-errorBackground);color:var(--vscode-inputValidation-errorForeground);border:1px solid var(--vscode-inputValidation-errorBorder)}" +
    "</style></head><body>" +
    "<h1>Apio – Create Example Project</h1>" +
    '<div class="instruction">' +
    "Use this page to create a new Apio project from one of the officially provided examples.<br><br>" +
    "Only boards that have at least one example are shown in the list below. " +
    "For the complete list of supported boards, use the command <strong>Tools → Boards → List boards</strong>." +
    "</div>" +
    '<form id="f">' +
    '<label for="board">1. Board</label>' +
    '<select id="board" required>' +
    '  <option value="" disabled selected>-- Select board --</option>' +
    boardOptions +
    "</select>" +
    '<label for="example">2. Example</label>' +
    '<select id="example" required>' +
    '  <option value="" disabled selected>-- Select example --</option>' +
    "</select>" +
    '<div id="desc" class="description"></div>' +
    '<label for="folder">3. Project folder (absolute path)</label>' +
    '<input id="folder" placeholder="/home/user/my-project   or   C:\\fpga\\my-project" required style="font-family:monospace;">' +
    '<button type="submit" id="btn">Create Project</button>' +
    '<div id="status"></div>' +
    "</form>" +
    "<script>" +
    "const vscode=acquireVsCodeApi();" +
    "const data=" +
    JSON.stringify(examplesData.examples) +
    ";" +
    'const b=document.getElementById("board"),e=document.getElementById("example"),d=document.getElementById("desc"),s=document.getElementById("status");' +
    'b.onchange=function(){e.innerHTML="<option value=\\"\\" disabled selected>-- Select example --</option>";d.textContent="";const x=b.value;if(x&&data[x]){const list=Object.keys(data[x]).sort();list.forEach(ex=>e.innerHTML+="<option value=\\""+ex+"\\">"+ex+"</option>");}};' +
    'e.onchange=function(){const x=b.value,y=e.value;if(x&&y&&data[x][y])d.textContent=data[x][y].description||"";else d.textContent="";};' +
    'document.getElementById("f").onsubmit=function(ev){ev.preventDefault();const board=b.value,ex=e.value,folder=document.getElementById("folder").value.trim();if(!board||!ex||!folder){s.innerHTML="<div class=\\"status error\\">Please fill all fields</div>";return;}document.getElementById("btn").disabled=true;s.innerHTML="<div class=\\"status\\">Creating project at <strong>"+folder+"</strong>...</div>";vscode.postMessage({command:"createProject",board:board,example:ex,folder:folder});};' +
    'window.addEventListener("message",function(m){if(m.data.command==="status"){s.innerHTML="<div class=\\"status "+(m.data.error?"error":"success")+"\\">"+m.data.text+"</div>";if(!m.data.error)setTimeout(()=>{vscode.postMessage({command:"done"});},2500);else document.getElementById("btn").disabled=false;}});' +
    "</script></body></html>"
  );
}

async function createProject(context, data, panel) {
  const folderPath = data.folder.trim();

  if (!path.isAbsolute(folderPath)) {
    panel.webview.postMessage({
      command: "status",
      text: "Error: Please enter an <strong>absolute path</strong><br>e.g. /home/user/my-project or C:\\fpga\\my-project",
      error: true,
    });
    return;
  }

  const example = data.board + "/" + data.example;

  try {
    if (fs.existsSync(folderPath)) {
      throw new Error("Directory already exists: " + folderPath);
    }

    fs.mkdirSync(folderPath, { recursive: true });

    await new Promise((resolve, reject) => {
      cp.exec(
        utils.apioBinaryPath() + " examples fetch " + example,
        { cwd: folderPath },
        (err, _stdout, stderr) => {
          if (err || stderr) {
            reject(
              new Error(
                stderr.trim() || err.message || "Failed to fetch example"
              )
            );
          } else {
            resolve();
          }
        }
      );
    });

    panel.webview.postMessage({
      command: "status",
      text:
        "Success! Opening project...<br><strong>" + folderPath + "</strong>",
      error: false,
    });

    // Signal to the apio activate() that will be called on the new
    // workspace to automatically open apio.ini. 
    await context.globalState.update("apio.justCreatedProject", true);

    // Switch to the new workspace. This will start a new instance of
    // this extension.
    setTimeout(() => {
      vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.file(folderPath),
        false
      );
    }, 1200);
  } catch (err) {
    panel.webview.postMessage({
      command: "status",
      text: "Error: " + err.message,
      error: true,
    });
  }
}

module.exports = { registerGetExampleWizard };
