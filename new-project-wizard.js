// new-project-wizard.js
// FINAL VERSION – numbered steps + moderately larger, prominent field titles

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');

const examples = require('./examples-data.js');
const BOARDS = Object.keys(examples.EXAMPLES_DATA.examples).sort();

function registerNewProjectWizard(context) {
  const commandId = 'apio.newProjectWizard';

  const disposable = vscode.commands.registerCommand(commandId, () => {
    showWizard();
  });

  context.subscriptions.push(disposable);
}

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
    'label{display:block;margin:2rem 0 .7rem;font-weight:650;font-size:1.08rem;color:var(--vscode-foreground)}' +  /* Perfect in-between size */
    'select,input{width:100%;padding:.8rem;font-size:1rem;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:4px;box-sizing:border-box}' +
    '.description{font-size:.9rem;color:var(--vscode-descriptionForeground);margin-top:.4rem;font-style:italic;min-height:1.2em}' +
    '.note{font-size:.9rem;color:var(--vscode-descriptionForeground);background:var(--vscode-editorInfo-background);padding:.8rem 1rem;border-radius:4px;margin:1.5rem 0 2rem;line-height:1.5;border-left:4px solid var(--vscode-editorInfo-foreground)}' +
    'button{margin-top:2.8rem;padding:.9rem 2rem;font-size:1.1rem;background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:4px;cursor:pointer}' +
    'button:hover{background:var(--vscode-button-hoverBackground)}button:disabled{opacity:.6;cursor:not-allowed}' +
    '.status{margin-top:1.5rem;padding:1rem;border-radius:4px;font-weight:500}' +
    '.status.success{background:#28a745;color:white}' +
    '.status.error{background:var(--vscode-inputValidation-errorBackground);color:var(--vscode-inputValidation-errorForeground);border:1px solid var(--vscode-inputValidation-errorBorder)}' +
    '</style></head><body>' +
    '<h1>Apio – Create New Project</h1>' +
    '<div class="note">Note: Only boards with at least one example are shown.</div>' +
    '<form id="f">' +

    '<label for="board">1. Board</label>' +
    '<select id="board" required>' +
    '  <option value="" disabled selected>-- Select board --</option>' +
         boardOptions +
    '</select>' +

    '<label for="example">2. Example</label>' +
    '<select id="example" required>' +
    '  <option value="" disabled selected>-- Select example --</option>' +
    '</select>' +

    '<div id="desc" class="description"></div>' +

    '<label for="folder">3. Project folder (absolute path)</label>' +
    '<input id="folder" placeholder="/home/user/my-project   or   C:\\fpga\\my-project" required style="font-family:monospace;">' +

    '<button type="submit" id="btn">Create Project</button>' +
    '<div id="status"></div>' +
    '</form>' +

    '<script>' +
    'const vscode=acquireVsCodeApi();' +
    'const data=' + JSON.stringify(examples.EXAMPLES_DATA.examples) + ';' +
    'const b=document.getElementById("board"),e=document.getElementById("example"),d=document.getElementById("desc"),s=document.getElementById("status");' +
    'b.onchange=function(){e.innerHTML="<option value=\\"\\" disabled selected>-- Select example --</option>";d.textContent="";const x=b.value;if(x&&data[x]){const list=Object.keys(data[x]).sort();list.forEach(ex=>e.innerHTML+="<option value=\\""+ex+"\\">"+ex+"</option>");}};' +
    'e.onchange=function(){const x=b.value,y=e.value;if(x&&y&&data[x][y])d.textContent=data[x][y].description||"";else d.textContent="";};' +
    'document.getElementById("f").onsubmit=function(ev){ev.preventDefault();const board=b.value,ex=e.value,folder=document.getElementById("folder").value.trim();if(!board||!ex||!folder){s.innerHTML="<div class=\\"status error\\">Please fill all fields</div>";return;}document.getElementById("btn").disabled=true;s.innerHTML="<div class=\\"status\\">Creating project at <strong>"+folder+"</strong>...</div>";vscode.postMessage({command:"createProject",board:board,example:ex,folder:folder});};' +
    'window.addEventListener("message",function(m){if(m.data.command==="status"){s.innerHTML="<div class=\\"status "+(m.data.error?"error":"success")+"\\">"+m.data.text+"</div>";if(!m.data.error)setTimeout(()=>{vscode.postMessage({command:"done"});},2500);else document.getElementById("btn").disabled=false;}});' +
    '</script></body></html>';
}

async function createProject(data, panel) {
  const folderPath = data.folder.trim();

  if (!path.isAbsolute(folderPath)) {
    panel.webview.postMessage({
      command: 'status',
      text: 'Error: Please enter an <strong>absolute path</strong><br>e.g. /home/user/my-project or C:\\fpga\\my-project',
      error: true
    });
    return;
  }

  const example = data.board + '/' + data.example;

  try {
    if (fs.existsSync(folderPath)) {
      throw new Error('Directory already exists: ' + folderPath);
    }

    fs.mkdirSync(folderPath, { recursive: true });

    await new Promise((resolve, reject) => {
      cp.exec('apio examples fetch ' + example, { cwd: folderPath }, (err, _stdout, stderr) => {
        if (err || stderr) {
          reject(new Error(stderr.trim() || err.message || 'Failed to fetch example'));
        } else {
          resolve();
        }
      });
    });

    panel.webview.postMessage({
      command: 'status',
      text: 'Success! Opening project...<br><strong>' + folderPath + '</strong>',
      error: false
    });

    setTimeout(() => {
      vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(folderPath), false);
    }, 1200);

  } catch (err) {
    panel.webview.postMessage({
      command: 'status',
      text: 'Error: ' + err.message,
      error: true
    });
  }
}

module.exports = { registerNewProjectWizard };