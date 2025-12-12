// notice-view.js
// 100% self-contained – main file only does:
// const { showMarkdown, hide } = require('./notice-view');

import * as vscode from "vscode";

const VIEW_ID = "apio.sidebar.notice";
const CONTEXT_KEY = "apio.sidebar.notice.enabled";

let webviewView = null;
let providerDisposable = null;
let currentMarkdown = "";

// Register the provider only once (lazy, on first show)
function ensureProviderRegistered() {
  if (providerDisposable) return;

  providerDisposable = vscode.window.registerWebviewViewProvider(VIEW_ID, {
    resolveWebviewView(wv) {
      webviewView = wv;
      wv.webview.options = {
        // Prohibit general scripts, for security.
        enableScripts: false,
        // This allows command links in the markdown text.
        enableCommandUris: true,
      };

      // If we already have markdown waiting and the view is supposed to be visible
      if (currentMarkdown && vscode.commands.getCommands().then) {
        // context exists
        const ctx = vscode.workspace.getConfiguration().get(CONTEXT_KEY);
        // Simpler: just render if we have content
        renderCurrentMarkdown();
      }
    },
  });

  // Automatic cleanup on extension deactivation
  vscode.extensions.onDidChange(() => {
    // VS Code does not have a direct deactivate hook here,
    // but the registration is automatically disposed when the extension unloads.
    // The disposable we stored is sufficient.
  });
}

async function renderCurrentMarkdown() {
  if (!webviewView || !currentMarkdown) return;

  try {
    const html = await vscode.commands.executeCommand(
      "markdown.api.render",
      currentMarkdown
    );
    webviewView.webview.html = getHtml(html);
  } catch {
    // Fallback when markdown.api.render is not available
    webviewView.webview.html = getHtml(currentMarkdown.replace(/\n/g, "<br>"));
  }
}

function getHtml(body) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body, .markdown-body { margin:0 !important; padding:8px 16px !important;
    font-family:var(--vscode-editor-font-family);
    font-size:var(--vscode-editor-font-size);
    color:var(--vscode-editor-foreground);
    background:var(--vscode-editor-background);
    line-height:1.5;
  }
  .markdown-body > :first-child { margin-top:0 !important; }
  h1,h2,h3,h4,h5,h6 { margin:0.4em 0 0.2em !important; }
  a { color:var(--vscode-textLink-foreground); }
</style>
</head>
<body class="markdown-body">${body}</body></html>`;
}

// Public API
export async function showMarkdown(markdown) {
  const md = markdown?.trim();
  if (!md) return;

  currentMarkdown = md;
  ensureProviderRegistered();
  await vscode.commands.executeCommand("setContext", CONTEXT_KEY, true);

  if (webviewView) {
    renderCurrentMarkdown();
  }
  // else: resolveWebviewView will call render when the view appears
}

export function hide() {
  vscode.commands.executeCommand("setContext", CONTEXT_KEY, false);
  if (webviewView) {
    webviewView.webview.html = ""; // free memory
  }
}
