// downloader.js
// Ensures that the apio pyinstaller bundle is installed and that
// the apio binary is available at ~/.apio/bin/apio[.exe]. If not,
// It's downloaded and installed on the fly.

// Standard imports
const fs = require("fs");
const path = require("path");
const stream = require("node:stream");
const childProcess = require("child_process");
const assert = require("node:assert");

// Dependency imports
const zipExtract = require("extract-zip");
const tar = require("tar");

// Local imports
const constants = require("./constants.js");
const platforms = require("./platforms.js");
const apioLog = require("./apio-log.js");
const jsonUtils = require("./json-utils.js");
const utils = require("./utils.js");

// Download url and local package name
const downloadMetadataFileName = "download-metadata.json";
let _downloadSrcUrl = null;
let _downloadDstFilePath = null;

// Initializes this module. Should be called once before any other
// function of this module.
function init() {
  // Should be called only once.
  assert(
    _downloadSrcUrl == null,
    "downloader.init() should be called at most once."
  );

  // Determine download information.
  const yyyymmdd = constants.APIO_RELEASE_TAG.replaceAll("-", "");
  const platformId = platforms.getPlatformId();
  const baseUrl =
    "https://github.com/" +
    constants.APIO_RELEASE_GITHUB_REPO +
    "/releases/download/" +
    constants.APIO_RELEASE_TAG +
    "/";
  const ext = platforms.isWindows() ? "zip" : "tgz";
  const packageFileName = `apio-cli-${platformId}-${yyyymmdd}-bundle.${ext}`;
  _downloadSrcUrl = baseUrl + packageFileName;
  _downloadDstFilePath = path.join(utils.apioHomeDir(), packageFileName);
}

// Ensures the Apio binary is ready and if not download and installs it.
// Throws an exception if failed.
async function ensureApioBinary() {
  try {
    // Check if the apio binary exists.
    const binaryExists = await _testFsItem(
      utils.apioBinaryPath(),
      fs.constants.X_OK | fs.constants.R_OK
    );
    apioLog.msg(
      `Apio binary ${utils.apioBinaryPath()} exists = ${binaryExists}`
    );

    // Check if the download metadata has a matching download url
    const metadataFilePath = path.join(
      utils.apioBinDir(),
      downloadMetadataFileName
    );
    //  'metadata' is {} if file doesn't exist or any error.
    const metadataDict = await jsonUtils.readJson(metadataFilePath);
    const lastUrl = metadataDict.url ?? null;
    const urlMatches = lastUrl == _downloadSrcUrl;
    apioLog.msg(`Download url match =  ${urlMatches}`);

    if (binaryExists && urlMatches) {
      // Binary is good, will use it.
      apioLog.msg(`Existing binary ok: ${utils.apioBinaryPath()}`);
    } else {
      // Binary is missing or not good, will download and install it.
      apioLog.msg("Need to download and install a new binary.");
      await _downloadAndInstall();
      apioLog.msg(`[Apio] Binary installed: ${utils.apioBinaryPath()}`);
    }
  } catch (err) {
    // Handle errors, we wrap with 'Apio' message and throw again.
    throw Error(`[Apio] binary installation failed: ${err.message}`);
  }
}

// Download the apio bundle and install it.
// This async function returns a promise that govern the process.
async function _downloadAndInstall() {
  apioLog.msg(`Downloading: ${_downloadSrcUrl}`);

  // Make the tmp dir if doesn't exist.
  await fs.promises.mkdir(utils.apioTmpDir(), { recursive: true });

  // Download the file to the tmp dir.
  // await _downloadFile(url, archivePath);
  await _downloadFile(_downloadSrcUrl, _downloadDstFilePath);

  // On macOS, remove extended attributes such as quarantine (macOS) from
  // the archive file.
  //
  // NOTE: As of Nov 2025, the quarantine attribute is set only when
  // we download manually from the browser. It is not set when we
  // download it here under VSCode.
  if (platforms.isDarwin()) {
    await new Promise((res) => {
      childProcess.exec(`xattr -c "${_downloadDstFilePath}"`, (err) => {
        if (err) {
          apioLog.msg(`MacOS quarantine removal err:  ${err.message}`);
        } else {
          apioLog.msg("MacOS quarantine removal returned OK.");
        }
        res();
      });
    });
  }

  // Extract
  if (_downloadDstFilePath.endsWith(".zip")) {
    await zipExtract(_downloadDstFilePath, { dir: utils.apioTmpDir() });
  } else if (_downloadDstFilePath.endsWith(".tgz")) {
    await tar.x({ file: _downloadDstFilePath, cwd: utils.apioTmpDir() });
  } else {
    throw new Error(`Unexpected package extension: ${_downloadDstFilePath}`);
  }

  // Clean up archive. We don't need it any more.
  await fs.promises.unlink(_downloadDstFilePath).catch(() => {});

  // Uncompressing the downloaded packages is supposed to create
  // a directory 'apio', sibling to the archive file, which
  // contain the apio binary and support files.
  const extractedApioDir = path.join(utils.apioTmpDir(), "apio");

  // Check that the unarchive indeed created an 'apio' dir.
  if (!(await _testFsItem(extractedApioDir))) {
    throw new Error('Archive did not contain "apio/" directory');
  }

  // Write the download metadata file to the tmpDir/apio dir, sibling
  // to the binary. We write it before we move the extracted apio
  // dir to 'bin' so the path is slightly different.
  const metadataPath = path.join(extractedApioDir, downloadMetadataFileName);
  let writeOk = await jsonUtils.writeJson(metadataPath, {
    url: _downloadSrcUrl,
    time: new Date().toISOString(),
  });
  if (!writeOk) {
    apioLog.msg(`Failed to write metadata to ${metadataPath}`);
    throw new Error(`Download failed, failed to write download metadata.`);
  }

  // TODO: Make it clearer, delete only if exists.
  //
  // Ensure apio bin dir exists, make an empty one if not.
  // await fs.promises.mkdir(utils.apioBinDir(), { recursive: true });

  // Remove old binDir, if exists.
  await fs.promises
    .rm(utils.apioBinDir(), { recursive: true, force: true })
    .catch(() => {});

  // Move apio/ → binDir
  await fs.promises.rename(extractedApioDir, utils.apioBinDir());

  // const apioBinaryPath = path.join(_apioBinDirPath, ap);
  // if (!(await fileExists(_apioBinaryPath))) {
  if (!(await _testFsItem(utils.apioBinaryPath()))) {
    throw new Error("Apio binary not found after extraction");
  }

  // Make the apio binary executable
  if (!platforms.isWindows()) {
    await fs.promises.chmod(utils.apioBinaryPath(), 0o755);
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

// Exported for require()
module.exports = { init, ensureApioBinary };
