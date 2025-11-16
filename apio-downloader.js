// apio-downloader.js
// Ensures that the apio pyinstaller bundle is installed and that
// the apio binary is available at ~/.apio/bin/apio[.exe]. If not,
// It's downloaded and installed on the fly.

"use strict";

// Standard imports
const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const child_process = require("child_process");

// Dependency imports
const zip_extract = require("extract-zip");
const tar = require("tar");

// Local imports
const platforms = require("./apio-platforms.js");

// Static state.
let _apioBinaryPath = null;
let _apioInstallPromise = null;

// Ensures Apio binary is ready.
// Re-validates file on every call.
// @returns {Promise<string>} path to apio / apio.exe
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

// Start downloading and installing the apio binary.
// Returns a promise that returns the path to the apio binary
// once it's installed successfully.
function startDownload() {
  // If already in progress, reuse the promise.
  if (_apioInstallPromise) return _apioInstallPromise;

  // Get an absolute path to the user's home dir.
  const homeDir = os.homedir();

  // Determine the absolute path of ~/.apio/tmp. We will
  // use it as a temporary storage of the downloaded package.
  const tmpDir = path.join(homeDir, ".apio", "tmp");

  // Determine the absolute path of ~/.apio/bin, this is
  // where we will store the apio binary and supporting files.
  const binDir = path.join(homeDir, ".apio", "bin");

  // Determine the name and the absolute path the apio binary.
  const binaryName = platforms.isWindows() ? "apio.exe" : "apio";
  const binaryPath = path.join(binDir, binaryName);

  // Create a promise that control the downloading and installation.
  _apioInstallPromise = fs.promises
    // Create the tmp dir if doesn't exist.
    .mkdir(tmpDir, { recursive: true })
    // Try to access the apio binary to see if it's already there.
    .then(() =>
      fs.promises.access(binaryPath, fs.constants.X_OK | fs.constants.R_OK)
    )
    .then(() => {
      // Apio binary found, we are done.
      _apioBinaryPath = binaryPath;
      console.log("[Apio] Using cached binary:", binaryPath);
      return binaryPath;
    })
    .catch(() => {
      // Apio binary not found, do the full download and installation.
      return downloadAndInstall(tmpDir, binDir, binaryName);
    })
    .then((p) => {
      // Here after successful installation, save and return the path.
      _apioBinaryPath = p;
      _apioInstallPromise = null;
      return p;
    })
    .catch((err) => {
      // Here when installation failed.
      _apioInstallPromise = null;
      throw err;
    });

  // Return the promise that govern the download and installation.
  return _apioInstallPromise;
}

// Download the apio bundle and extract and install it.
// This async function returns a promise that govern the process
// and it's value on successful completion is the absolute path
// of the install apio executable.
async function downloadAndInstall(tmpDir, binDir, binaryName) {
  const tag = "2025-11-15";
  const version = "1.0.1";

  const yyyymmdd = tag.replaceAll("-", "");
  const platform_id = platforms.getPlatformId();

  const baseUrl = `https://github.com/FPGAwars/apio-dev-builds/releases/download/${tag}/`;
  const archiveName = `apio-${platform_id}-${version}-${yyyymmdd}-bundle.tgz`;
  const url = baseUrl + archiveName;
  const archivePath = path.join(tmpDir, archiveName);

  console.log(`[Apio] Downloading: ${url}`);
  await downloadFile(url, archivePath);

  // Remove quarantine (macOS) from the archive.
  // TODO: Do we really need it?
  if (platforms.isDarwin()) {
    await new Promise((res) => {
      child_process.exec(
        `xattr -d com.apple.quarantine "${archivePath}"`,
        (err) => {
          if (err)
            console.warn("[Apio] Quarantine removal failed:", err.message);
          else console.log("[Apio] Quarantine removed");
          res();
        }
      );
    });
  }

  // Extract
  if (archiveName.endsWith(".zip")) {
    await zip_extract(archivePath, { dir: tmpDir });
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

// A primitivee function to download the apio bundle from 'url'.
// to the file path 'dest'. Returns a promise that govevern the
// process
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

// Checks if the given file exists.
// Returns a promise with a boolean value.
async function fileExists(path) {
  try {
    await fs.promises.access(path);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
module.exports = { ensureApioBinary };
