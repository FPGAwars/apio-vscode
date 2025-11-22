// view-notice.js
// One-function API: showHtmlBody("<p>Hello world</p>")

const vscode = require("vscode");

let webviewView = null;
let pendingBody = null;
let registered = false;

function ensureRegistered() {
  if (registered) return;

  vscode.window.registerWebviewViewProvider(
    "apio.sidebar.notice",
    {
      resolveWebviewView(wv) {
        webviewView = wv;
        webviewView.webview.options = { enableScripts: false };

        if (pendingBody !== null) {
          _applyBody(pendingBody);
          pendingBody = null;
        }
      },
    },
    { webviewOptions: { retainContextWhenHidden: true } }
  );

  // Enable view if you use a when-clause
  vscode.commands.executeCommand(
    "setContext",
    "apio.sidebar.notice.enabled",
    true
  );

  registered = true;
}

function _applyBody(bodyHtml) {
  if (!webviewView) return;

  webviewView.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-editor-foreground);
      background-color: var(--vscode-editor-background);
      padding: 12px 16px;
      margin: 0;
      line-height: 1.5;
    }
    a { color: var(--vscode-textLink-foreground); }
    h1, h2, h3 { margin-top: 1.2em; }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

/**
 * Display content in the NOTICE sidebar webview
 * @param {string} bodyHtml - Any HTML fragment (e.g. <p>Text</p>, <h3>Title</h3><ul>...)
 */
function showHtmlBody(bodyHtml) {
  ensureRegistered();

  if (webviewView && webviewView.visible) {
    _applyBody(bodyHtml);
  } else {
    pendingBody = bodyHtml; // Will be applied as soon as the view becomes visible
  }
}

module.exports = { showHtmlBody };
