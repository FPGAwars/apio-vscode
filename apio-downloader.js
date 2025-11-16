// apio-downloader.js
// Updated: November 15, 2025
// Workflow:
//   1. ~/.apio/tmp/<original-archive-name>
//   2. extract → ~/.apio/tmp/apio/
//   3. move apio/ → ~/.apio/bin/ (overwrite)
//   4. binary: ~/.apio/bin/apio

'use strict';

const fs      = require('fs');
const path    = require('path');
const os      = require('os');
const https   = require('https');
const extract = require('extract-zip');
const tar     = require('tar');
const { exec } = require('child_process');

let _apioBinaryPath = null;
let _apioInstallPromise = null;

/**
 * Ensures Apio binary is ready.
 * Re-validates file on every call.
 * @returns {Promise<string>} path to apio / apio.exe
 */
function ensureApioBinary() {
  if (_apioBinaryPath) {
    return fs.promises.access(_apioBinaryPath, fs.constants.X_OK | fs.constants.R_OK)
      .then(() => _apioBinaryPath)
      .catch(() => { _apioBinaryPath = null; return startDownload(); });
  }
  return startDownload();
}

function startDownload() {
  if (_apioInstallPromise) return _apioInstallPromise;

  const homeDir = os.homedir();
  const tmpDir  = path.join(homeDir, '.apio', 'tmp');
  const binDir  = path.join(homeDir, '.apio', 'bin');
  const isWin   = os.platform() === 'win32';
  const binaryName = isWin ? 'apio.exe' : 'apio';
  const binaryPath = path.join(binDir, binaryName);

  _apioInstallPromise = fs.promises.mkdir(tmpDir, { recursive: true })
    .then(() => fs.promises.access(binaryPath, fs.constants.X_OK | fs.constants.R_OK))
    .then(() => {
      _apioBinaryPath = binaryPath;
      console.log('[Apio] Using cached binary:', binaryPath);
      return binaryPath;
    })
    .catch(() => downloadAndInstall(tmpDir, binDir, binaryName, isWin))
    .then(p => { _apioBinaryPath = p; _apioInstallPromise = null; return p; })
    .catch(err => { _apioInstallPromise = null; throw err; });

  return _apioInstallPromise;
}

/* ------------------------------------------------------------------ */
async function downloadAndInstall(tmpDir, binDir, binaryName, isWin) {
  const platform = os.platform();
  const arch     = os.arch();

  const urls = {
    win32: 'https://github.com/FPGAwars/apio/releases/download/v0.10.2/apio-0.10.2-win64.zip',
    'darwin_x64': 'https://github.com/FPGAwars/apio-dev-builds/releases/download/2025-11-15/apio-darwin-x64-1.0.1-20251115-bundle.tgz',
    'darwin_arm64': 'https://github.com/FPGAwars/apio-dev-builds/releases/download/2025-11-15/apio-darwin-arm64-1.0.1-20251115-bundle.tgz',
    linux: 'https://github.com/FPGAwars/apio-dev-builds/releases/download/2025-11-15/apio-linux-x64-1.0.1-20251115-bundle.tgz',
  };

  const key = platform === 'darwin' ? `${platform}_${arch}` : platform;
  const url = urls[key];
  if (!url) throw new Error(`Unsupported platform/arch: ${platform}/${arch}`);

  const archiveName = path.basename(url);  // original filename
  const archivePath = path.join(tmpDir, archiveName);

  console.log(`[Apio] Downloading: ${url}`);
  await downloadFile(url, archivePath);

  // Extract
  if (archiveName.endsWith('.zip')) {
    await extract(archivePath, { dir: tmpDir });
  } else if (archiveName.endsWith('.tgz')) {
    await tar.x({ file: archivePath, cwd: tmpDir });
  }

  // Clean up archive
  await fs.promises.unlink(archivePath).catch(() => {});

  // Expected: tmpDir/apio/
  const extractedApioDir = path.join(tmpDir, 'apio');
  if (!await fileExists(extractedApioDir)) {
    throw new Error('Archive did not contain "apio/" directory');
  }

  // Ensure binDir exists
  await fs.promises.mkdir(binDir, { recursive: true });

  // Remove old binDir (overwrite)
  await fs.promises.rm(binDir, { recursive: true, force: true }).catch(() => {});

  // Move apio/ → binDir
  await fs.promises.rename(extractedApioDir, binDir);

  const binaryPath = path.join(binDir, binaryName);
  if (!await fileExists(binaryPath)) {
    throw new Error('Apio binary not found after extraction');
  }

  // Make executable
  if (!isWin) {
    await fs.promises.chmod(binaryPath, 0o755);
  }

  // Remove quarantine (macOS)
  if (platform === 'darwin') {
    await new Promise((res) => {
      exec(`xattr -d com.apple.quarantine "${binaryPath}"`, (err) => {
        if (err) console.warn('[Apio] Quarantine removal failed:', err.message);
        else console.log('[Apio] Quarantine removed');
        res();
      });
    });
  }

  return binaryPath;
}

/* ------------------------------------------------------------------ */
function downloadFile(url, dest, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    function download(redirectUrl, redirectsLeft) {
      const file = fs.createWriteStream(dest);

      https.get(redirectUrl, { 
        headers: { 
          'User-Agent': 'vscode-apio-extension',
          'Accept': 'application/octet-stream'
        } 
      }, (res) => {
        if (res.statusCode === 302 && redirectsLeft > 0) {
          const location = res.headers.location;
          if (!location) {
            file.destroy();
            return reject(new Error('302 without Location'));
          }
          console.log(`[Apio] Redirect → ${location}`);
          file.destroy();
          return download(location, redirectsLeft - 1);
        }

        if (res.statusCode !== 200) {
          file.destroy();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }

        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }

    download(url, maxRedirects);
  });
}

async function fileExists(p) {
  try { await fs.promises.access(p); return true; }
  catch { return false; }
}

/* ------------------------------------------------------------------ */
module.exports = { ensureApioBinary };