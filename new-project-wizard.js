// new-project-wizard.js
// FINAL CLEAN VERSION – perfect when called once from activate()

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');

const examples = require('./examples-data.js');
const BOARDS = Object.keys(examples.EXAMPLES_DATA.examples).sort();

function registerNewProjectWizard(context) {
  const commandId = 'apio.newProjectWizard';

  // ONE call: handler + title + category + icon
  const disposable = vscode.commands.registerCommand(
    commandId,
    () => {
      showWizard();
    },
    {
      title: 'Apio: New Project (Wizard)',
      category: 'Apio',
      icon: {
        light: path.join(context.extensionPath, 'resources', 'light', 'add.svg'),
        dark: path.join(context.extensionPath, 'resources', 'dark', 'add.svg')
      }
    }
  );

  context.subscriptions.push(disposable);
}

// ... rest of the file (showWizard, getWebviewContent, createProject) unchanged ...

function showWizard() {
  const panel = vscode.window.createWebviewPanel(
    'apioWizard',
    'Apio – New Project',
    vscode.ViewColumn.Active,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  panel.webview.html = getWebviewContent();

  panel.webview.onDidReceiveMessage(msg => {
    if (msg.command === 'createProject') {
      createProject(msg, panel);
    }
  });
}

function getWebviewContent() {
  let boardOptions = '';
  for (let i = 0; i < BOARDS.length; i++) {
    const b = BOARDS[i];
    const cnt = Object.keys(examples.EXAMPLES_DATA.examples[b]).length;
    const s = cnt === 1 ? '' : 's';
    boardOptions += '<option value="' + b + '">' + b + ' (' + cnt + ' example' + s + ')</option>';
  }

  return '<!DOCTYPE html>\n' +
    '<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Apio – New Project</title>' +
    '<style>' +
    'body{font-family:var(--vscode-font-family,sans-serif);font-size:var(--vscode-editor-font-size,14px);padding:2rem;background:var(--vscode-editor-background);color:var(--vscode-editor-foreground);line-height:1.6;margin:0}' +
    'h1{margin-bottom:1.5rem;border-bottom:1px solid var(--vscode-editorWidget-border);padding-bottom:.5rem}' +
    'label{display:block;margin:1.8rem 0 .6rem;font-weight:600}' +
    'select,input{width:100%;padding:.8rem;font-size:1rem;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:4px;box-sizing:border-box}' +
    '.description{font-size:.9rem;color:var(--vscode-descriptionForeground);margin-top:.4rem;font-style:italic;min-height:1.2em}' +
    'button{margin-top:2.5rem;padding:.9rem 2rem;font-size:1.1rem;background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:4px;cursor:pointer}' +
    'button:hover{background:var(--vscode-button-hoverBackground)}button:disabled{opacity:.6;cursor:not-allowed}' +
    '.status{margin-top:1.5rem;padding:1rem;border-radius:4px;font-weight:500}' +
    '.status.success{background:#28a745;color:white}' +
    '.status.error{background:var(--vscode-inputValidation-errorBackground);color:var(--vscode-inputValidation-errorForeground);border:1px solid var(--vscode-inputValidation-errorBorder)}' +
    '</style></head><body>' +
    '<h1>Apio – Create New Project</h1>' +
    '<form id="f">' +
    '<label for="board">Board</label><select id="board" required>' + boardOptions + '</select>' +
    '<label for="example">Example</label><select id="example" required><option value="">-- Select board first --</option></select>' +
    '<div id="desc" class="description"></div>' +
    '<label for="folder">Project folder name</label><input id="folder" placeholder="my-blinky-project" required>' +
    '<button type="submit" id="btn">Create Project</button>' +
    '</form><div id="status"></div>' +
    '<script>' +
    'const vscode=acquireVsCodeApi();' +
    'const data=' + JSON.stringify(examples.EXAMPLES_DATA.examples) + ';' +
    'const b=document.getElementById("board"),e=document.getElementById("example"),d=document.getElementById("desc"),s=document.getElementById("status");' +
    'b.onchange=function(){e.innerHTML="<option>-- Loading --</option>";d.textContent="";const x=b.value;if(x&&data[x]){const list=Object.keys(data[x]).sort();let o="<option value=\\"\\" disabled selected>-- Choose example --</option>";for(let i=0;i<list.length;i++)o+="<option value=\\""+list[i]+"\\">"+list[i]+"</option>";e.innerHTML=o;}};' +
    'e.onchange=function(){const x=b.value,y=e.value;if(x&&y&&data[x][y])d.textContent=data[x][y].description||"";else d.textContent="";};' +
    'document.getElementById("f").onsubmit=function(ev){ev.preventDefault();const board=b.value,ex=e.value,folder=document.getElementById("folder").value.trim();if(!board||!ex||!folder){s.innerHTML="<div class=\\"status error\\">Fill all fields</div>";return;}document.getElementById("btn").disabled=true;s.innerHTML="<div class=\\"status\\">Creating <strong>"+folder+"</strong> …</div>";vscode.postMessage({command:"createProject",board:board,example:ex,folder:folder});};' +
    'window.addEventListener("message",function(m){if(m.data.command==="status"){s.innerHTML="<div class=\\"status "+(m.data.error?"error":"success")+"\\">"+m.data.text+"</div>";if(!m.data.error)setTimeout(()=>{vscode.postMessage({command:"done"});},2500);else document.getElementById("btn").disabled=false;}});' +
    '</script></body></html>';
}

async function createProject(data, panel) {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    panel.webview.postMessage({ command: 'status', text: 'No workspace folder open', error: true });
    return;
  }

  const root = folders[0].uri.fsPath;
  const target = path.join(root, data.folder);
  const example = data.board + '/' + data.example;

  try {
    if (fs.existsSync(target)) throw new Error('Folder already exists');
    fs.mkdirSync(target, { recursive: true });

    await new Promise((res, rej) => {
      cp.exec('apio examples fetch ' + example, { cwd: target }, (err, _stdout, stderr) => {
        if (err || stderr) rej(new Error(stderr.trim() || err.message));
        else res();
      });
    });

    panel.webview.postMessage({ command: 'status200', text: 'Success! Reopening folder…', error: false });
    setTimeout(() => vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(target), false), 1000);
  } catch (e) {
    panel.webview.postMessage({ command: 'status', text: 'Error: ' + e.message, error: true });
  }
}

module.exports = { registerNewProjectWizard };