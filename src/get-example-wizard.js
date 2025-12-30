// Implements the 'get example' command wizard.

const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

const utils = require("./utils.js");
const tasks = require("./tasks.js");
const apioLog = require("./apio-log.js");

// Load the examples json data from apio. Before invoking this
// wizard we run 'apio api get-examples -o <output-file>'.
function loadApioExamplesData() {
  const filePath = utils.apioTmpChild("examples.json");
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
  const commandId = "apio.projectFromExample";

  apioLog.msg(`Registering command: ${commandId}`);
  const disposable = vscode.commands.registerCommand(commandId, () => {
    showWizard(context);
  });

  context.subscriptions.push(disposable);
}

function showWizard(context) {
  apioLog.msg(`showWizard() called`);
  const panel = vscode.window.createWebviewPanel(
    "apioWizard",
    "Apio – New Project",
    vscode.ViewColumn.Active,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  panel.webview.html = getWebviewContent();

  panel.webview.onDidReceiveMessage((msg) => {
    if (msg.command === "createProjectFromExample") {
      createProjectFromExampleHandler(context, msg, panel);
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

  // Hint for the dir field.
  const dirHint = path.join(utils.userHomeDir(), "my-project");

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
    "#status{min-height:70px;margin-top:2rem;padding:1rem;border-radius:4px;background:var(--vscode-editorWidget-background);border:1px solid var(--vscode-widget-border);text-align:center;font-weight:500;transition:all .3s ease}" +
    ".status-message{padding:.8rem;border-radius:4px;font-weight:500}" +
    ".status-message.success{background:#28a745;color:white}" +
    ".status-message.error{background:var(--vscode-inputValidation-errorBackground);color:var(--vscode-inputValidation-errorForeground);border:1px solid var(--vscode-inputValidation-errorBorder)}" +
    "</style></head><body>" +
    "<h1>Create Apio Example Project</h1>" +
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
    '<input id="folder" placeholder="E.g. ' +
    dirHint +
    '" required style="font-family:monospace;">' +
    '<button type="submit" id="btn">Create Project</button>' +
    '<div id="status"><div id="placeholder" style="color:var(--vscode-disabledForeground);font-style:italic;">Status messages will appear here once you submit the form.</div></div>' +
    "</form>" +
    "<script>" +
    "const vscode=acquireVsCodeApi();" +
    "const data=" +
    JSON.stringify(examplesData.examples) +
    ";" +
    'const b=document.getElementById("board"),e=document.getElementById("example"),d=document.getElementById("desc"),s=document.getElementById("status");' +
    'function clearStatus(){s.innerHTML=\'<div id="placeholder" style="color:var(--vscode-disabledForeground);font-style:italic;">Status messages will appear here once you submit the form.</div>\';}' +
    "clearStatus();" +
    'b.onchange=function(){e.innerHTML="<option value=\\"\\" disabled selected>-- Select example --</option>";d.textContent="";const x=b.value;if(x&&data[x]){const list=Object.keys(data[x]).sort();list.forEach(ex=>e.innerHTML+="<option value=\\""+ex+"\\">"+ex+"</option>");}};' +
    'e.onchange=function(){const x=b.value,y=e.value;if(x&&y&&data[x][y])d.textContent=data[x][y].description||"";else d.textContent="";};' +
    'document.getElementById("f").onsubmit=function(ev){ev.preventDefault();const board=b.value,ex=e.value,folder=document.getElementById("folder").value.trim();if(!board||!ex||!folder){s.innerHTML="<div class=\\"status-message error\\">Please fill all fields</div>";return;}document.getElementById("btn").disabled=true;s.innerHTML="<div class=\\"status-message\\">Creating project at <strong>"+folder+"</strong>...</div>";vscode.postMessage({command:"createProjectFromExample",board:board,example:ex,folder:folder});};' +
    'window.addEventListener("message",function(m){if(m.data.command==="status"){const cls=m.data.error?"error":"success";s.innerHTML="<div class=\\"status-message "+cls+"\\">"+m.data.text+"</div>";if(!m.data.error)setTimeout(()=>{vscode.postMessage({command:"done"});},2500);else document.getElementById("btn").disabled=false;}});' +
    "</script></body></html>"
  );
}

// Dispatched when the user submit the form to create the project.
async function createProjectFromExampleHandler(context, msg, panel) {
  // Get the destination directory.
  let folder = msg.folder.trim();

  // Get the example info.
  const board = msg.board;
  const example = msg.example;

  // Called back with ok/error status which it displays to the user
  // as green/red.
  function callback(ok, text) {
    panel.webview.postMessage({
      command: "status",
      text: text,
      error: !ok,
    });
  }

  // Try to create the example project and then open it in VSCode. In case
  // of a success, this call doesn't return because we switch to a new
  // workspace.
  await tasks.openProjectFromExample(context, board, example, folder, callback);
}

// Export for require()
module.exports = { registerGetExampleWizard };
