// apio-downloader.js
// Updated: November 15, 2025
// Workflow:
//   1. ~/.apio/tmp/<original-archive-name>
//   2. extract → ~/.apio/tmp/apio/
//   3. move apio/ → ~/.apio/bin/ (overwrite)
//   4. binary: ~/.apio/bin/apio

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const extract = require("extract-zip");
const tar = require("tar");
const { exec } = require("child_process");

const platforms = require("./apio-platforms.js");

let _apioBinaryPath = null;
let _apioInstallPromise = null;

/**
 * Ensures Apio binary is ready.
 * Re-validates file on every call.
 * @returns {Promise<string>} path to apio / apio.exe
 */
function ensureApioBinary() {
  if (_apioBinaryPath) {
    return fs.promises
      .access(_apioBinaryPath, fs.constants.X_OK | fs.constants.R_OK)
      .then(() => _apioBinaryPath)
      .catch(() => {
        _apioBinaryPath = null;
        return startDownload();
      });
  }
  return startDownload();
}

function startDownload() {
  if (_apioInstallPromise) return _apioInstallPromise;

  const homeDir = os.homedir();
  const tmpDir = path.join(homeDir, ".apio", "tmp");
  const binDir = path.join(homeDir, ".apio", "bin");
  // const isWin = os.platform() === "win32";
  const binaryName = platforms.isWindows() ? "apio.exe" : "apio";
  const binaryPath = path.join(binDir, binaryName);

  _apioInstallPromise = fs.promises
    .mkdir(tmpDir, { recursive: true })
    .then(() =>
      fs.promises.access(binaryPath, fs.constants.X_OK | fs.constants.R_OK)
    )
    .then(() => {
      _apioBinaryPath = binaryPath;
      console.log("[Apio] Using cached binary:", binaryPath);
      return binaryPath;
    })
    .catch(() => downloadAndInstall(tmpDir, binDir, binaryName))
    .then((p) => {
      _apioBinaryPath = p;
      _apioInstallPromise = null;
      return p;
    })
    .catch((err) => {
      _apioInstallPromise = null;
      throw err;
    });

  return _apioInstallPromise;
}

/* ------------------------------------------------------------------ */
async function downloadAndInstall(tmpDir, binDir, binaryName) {
  // const platform = os.platform();
  // const arch = os.arch();

  const baseUrl =
    "https://github.com/FPGAwars/apio-dev-builds/releases/download/2025-11-15/";

  const archiveNames = {
    "darwin-arm64": "apio-darwin-arm64-1.0.1-20251115-bundle.tgz",
  };

  // const key = platform === "darwin" ? `${platform}_${arch}` : platform;
  const archiveName = archiveNames[platforms.getPlatformId()];
  if (!archiveName) {
    throw new Error(`Unsupported platform id: ${platforms.getPlatformId()}`);
  }
  // const url = urls[platforms.getPlatformId()];
  const url = baseUrl + archiveName;

  // const archiveName = path.basename(url); // original filename
  const archivePath = path.join(tmpDir, archiveName);

  console.log(`[Apio] Downloading: ${url}`);
  await downloadFile(url, archivePath);

  // Remove quarantine (macOS) from the archive.
  // TODO: Do we really need it?
  if (platforms.isDarwin()) {
    await new Promise((res) => {
      exec(`xattr -d com.apple.quarantine "${archivePath}"`, (err) => {
        if (err) console.warn("[Apio] Quarantine removal failed:", err.message);
        else console.log("[Apio] Quarantine removed");
        res();
      });
    });
  }

  // Extract
  if (archiveName.endsWith(".zip")) {
    await extract(archivePath, { dir: tmpDir });
  } else if (archiveName.endsWith(".tgz")) {
    await tar.x({ file: archivePath, cwd: tmpDir });
  }

  // Clean up archive. We don't need it any more.
  await fs.promises.unlink(archivePath).catch(() => {});

  // Expected: tmpDir/apio/
  const extractedApioDir = path.join(tmpDir, "apio");
  if (!(await fileExists(extractedApioDir))) {
    throw new Error('Archive did not contain "apio/" directory');
  }

  // Ensure binDir exists, make an empty one if not.
  await fs.promises.mkdir(binDir, { recursive: true });

  // Remove old binDir (overwrite)
  await fs.promises
    .rm(binDir, { recursive: true, force: true })
    .catch(() => {});

  // Move apio/ → binDir
  await fs.promises.rename(extractedApioDir, binDir);

  const apioBinaryPath = path.join(binDir, binaryName);
  if (!(await fileExists(apioBinaryPath))) {
    throw new Error("Apio binary not found after extraction");
  }

  // Make the apio binary executable
  if (!platforms.isWindows()) {
    await fs.promises.chmod(apioBinaryPath, 0o755);
  }

  return apioBinaryPath;
}

/* ------------------------------------------------------------------ */
function downloadFile(url, dest, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    function download(redirectUrl, redirectsLeft) {
      const file = fs.createWriteStream(dest);

      https
        .get(
          redirectUrl,
          {
            headers: {
              "User-Agent": "vscode-apio-extension",
              Accept: "application/octet-stream",
              // Force the OS stack to ignore any local HTTP cache
              // "Cache-Control": "no-cache, no-store, must-revalidate",
              // Pragma: "no-cache",
              // Expires: "0",
            },
          },
          (res) => {
            if (res.statusCode === 302 && redirectsLeft > 0) {
              const location = res.headers.location;
              if (!location) {
                file.destroy();
                return reject(new Error("302 without Location"));
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
            file.on("finish", () => {
              file.close();
              resolve();
            });
          }
        )
        .on("error", (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
    }

    download(url, maxRedirects);
  });
}

async function fileExists(p) {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
module.exports = { ensureApioBinary };
