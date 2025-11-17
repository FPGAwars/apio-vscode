// apio-downloader.js
// Ensures that the apio pyinstaller bundle is installed and that
// the apio binary is available at ~/.apio/bin/apio[.exe]. If not,
// It's downloaded and installed on the fly.

"use strict";

// Standard imports
const fs = require("fs");
const path = require("path");
const os = require("os");
const stream = require("node:stream");
const childProcess = require("child_process");
const assert = require("node:assert");

// Dependency imports
const zipExtract = require("extract-zip");
const tar = require("tar");

// Local imports
const platforms = require("./apio-platforms.js");
const apioLog = require("./apio-log.js");

// The release to download
  const apioReleaseTag = "2025-11-17";
  const githubRepo = "FPGAwars/apio-dev-builds";

// Environment. Initialized on first call to ensureApioBinary
let _apioBinDirPath = null;
let _apioTmpDirPath = null;
let _apioBinaryName = null;
let _apioBinaryPath = null;

// Initializes this module. Should be called once before any other
// function of this module.
function init() {
  // Should be called only once.
  assert(
    _apioBinDirPath == null,
    "apio-downloader.init() should be called at most once."
  );

  // Get the absolute path to the user home dir.
  const homeDir = os.homedir();
  apioLog.msg(`User home dir: ${homeDir}`);

  // Determine the absolute path of ~/.apio/tmp. We will
  // use it as a temporary storage of the downloaded package.
  _apioTmpDirPath = path.join(homeDir, ".apio", "tmp");
  apioLog.msg(`Apio tmp dir: ${_apioTmpDirPath}`);

  // Determine the absolute path of ~/.apio/bin, this is
  // where we will store the apio binary and supporting files.
  _apioBinDirPath = path.join(homeDir, ".apio", "bin");
  apioLog.msg(`Apio bin dir: ${_apioBinDirPath}`);

  // Determine apio binary name
  _apioBinaryName = platforms.isWindows() ? "apio.exe" : "apio";

  // Determine the absolute path of the apio binary name.
  _apioBinaryPath = path.join(_apioBinDirPath, _apioBinaryName);
  apioLog.msg(`Apio binary path: ${_apioBinaryPath}`);
}

// Ensures the Apio binary is ready and if not download and installs it.
// @returns {Promise<string>} with the path to apio / apio.exe
async function ensureApioBinary() {
  // Check if the binary exists.
  const binaryOk = await _testFsItem(
    _apioBinaryPath,
    fs.constants.X_OK | fs.constants.R_OK
  );

  if (binaryOk) {
    // Binary is good, will use it.
    apioLog.msg(`Apio binary found: ${_apioBinDirPath}`);
  } else {
    // Binary is missing or not good, will download and install it.
    apioLog.msg("Apio binary not found, will install.");
    await _downloadAndInstall();
  }

  return _apioBinaryPath;
}

// Download the apio bundle and install it.
// This async function returns a promise that govern the process.
async function _downloadAndInstall() {

  const yyyymmdd = apioReleaseTag.replaceAll("-", "");
  const platformId = platforms.getPlatformId();
  const extension = platforms.isWindows() ? "zip" : "tgz";

  const baseUrl = `https://github.com/${githubRepo}/releases/download/${apioReleaseTag}/`;
  const archiveName = `apio-${platformId}-${yyyymmdd}-bundle.${extension}`;
  const url = baseUrl + archiveName;
  const archivePath = path.join(_apioTmpDirPath, archiveName);

  apioLog.msg(`[Apio] Downloading: ${url}`);

  // Make the tmp dir if doesn't exist.
  await fs.promises.mkdir(_apioTmpDirPath, { recursive: true });

  // Download the file to the tmp dir.
  await _downloadFile(url, archivePath);

  // Remove quarantine (macOS) from the archive.
  //
  // TODO: Do we really need this or is the bundle ok because we download
  // from VSCode?
  if (platforms.isDarwin()) {
    await new Promise((res) => {
      childProcess.exec(
        `xattr -d com.apple.quarantine "${archivePath}"`,
        (err) => {
          if (err) {
            console.warn("[Apio] Quarantine removal failed:", err.message);
            apioLog.msg("MacOS quarantine removal was not performed");
          } else {
            console.log("[Apio] Quarantine removed");
            apioLog.msg("MaxOS quarantine removal was performed");
          }
          res();
        }
      );
    });
  }

  // Extract
  if (archiveName.endsWith(".zip")) {
    await zipExtract(archivePath, { dir: _apioTmpDirPath });
  } else if (archiveName.endsWith(".tgz")) {
    await tar.x({ file: archivePath, cwd: _apioTmpDirPath });
  }

  // Clean up archive. We don't need it any more.
  await fs.promises.unlink(archivePath).catch(() => {});

  // Expected: tmpDir/apio/
  const extractedApioDir = path.join(_apioTmpDirPath, "apio");
  // if (!(await fileExists(extractedApioDir))) {
  if (!(await _testFsItem(extractedApioDir))) {
    throw new Error('Archive did not contain "apio/" directory');
  }

  // Ensure binDir exists, make an empty one if not.
  await fs.promises.mkdir(_apioBinDirPath, { recursive: true });

  // Remove old binDir (overwrite)
  await fs.promises
    .rm(_apioBinDirPath, { recursive: true, force: true })
    .catch(() => {});

  // Move apio/ → binDir
  await fs.promises.rename(extractedApioDir, _apioBinDirPath);

  // const apioBinaryPath = path.join(_apioBinDirPath, ap);
  // if (!(await fileExists(_apioBinaryPath))) {
  if (!(await _testFsItem(_apioBinaryPath))) {
    throw new Error("Apio binary not found after extraction");
  }

  // Make the apio binary executable
  if (!platforms.isWindows()) {
    await fs.promises.chmod(_apioBinaryPath, 0o755);
  }
}

// fetch is global in Node.js 18+ (no require needed at all!)
async function _downloadFile(url, dest, maxRedirects = 5) {
  let currentUrl = url;
  let redirectsLeft = maxRedirects;

  while (redirectsLeft >= 0) {
    const res = await fetch(currentUrl, {
      headers: {
        "User-Agent": "vscode-apio-extension",
        Accept: "application/octet-stream",
      },
      redirect: "manual",
    });

    apioLog.msg(`HTTP ${res.status}`);

    if (
      [301, 302, 303, 307, 308].includes(res.status) &&
      res.headers.get("location")
    ) {
      currentUrl = new URL(res.headers.get("location"), currentUrl).href;
      apioLog.msg("URL redirect.");
      redirectsLeft--;
      continue;
    }

    if (res.status !== 200 || !res.body) {
      throw new Error(`HTTP error ${res.status}`);
    }

    // TODO: Move the require to the import and use here stream.promises.pipeline()
    // await require("node:stream/promises").pipeline(res.body, fs.createWriteStream(dest));
    await stream.promises.pipeline(res.body, fs.createWriteStream(dest));
    apioLog.msg(`Downloaded ${dest}`);
    return;
  }

  throw new Error("Too many redirects");
}

// Similar to fs.promises.access but return true/false instead
// of success/exception.
async function _testFsItem(path, mode = fs.constants.F_OK) {
  try {
    await fs.promises.access(path, mode);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
module.exports = { init, ensureApioBinary };
