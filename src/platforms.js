// Platform detection utilities

const process = require("process");

// Maps the host type of to apio platform id.
const SUPPORTED_HOST_TYPES = {
  "darwin-arm64": "darwin-arm64",
  "linux-x64": "linux-x86-64",
  "win32-x64": "windows-amd64",
};

// Thrown by getApioPlatformId() when the platform is not supported by apio.
class UnsupportedPlatformError extends Error {
  constructor(hostType) {
    super(`Unsupported platform: ${hostType}`);
    this.name = "UnsupportedPlatformError";
    this.hostType = hostType;
  }
}

// Returns the apio platform id (a string). Throws UnsupportedPlatformError
// if the platform is not supported by apio.
function getApioPlatformId() {
  // The raw host type, e.g. 'darwin-x64'. This is not an apio platform id.
  const hostType = `${process.platform}-${process.arch}`;
  const platformId = SUPPORTED_HOST_TYPES[hostType];
  if (!platformId) {
    throw new UnsupportedPlatformError(hostType);
  }
  return platformId;
}

// Returns true if running on windows, regardless if the
// platform is supported by Apio.
function isWindows() {
  return process.platform === "win32";
}

// Return true if running on darwin, regardless if the
// platform is supported by Apio.
function isDarwin() {
  return process.platform === "darwin";
}

// Return true if running on linux, regardless if the
// platform is supported by Apio.
function isLinux() {
  return process.platform === "linux";
}

// Export for require()
module.exports = {
  UnsupportedPlatformError,
  getApioPlatformId,
  isWindows,
  isDarwin,
  isLinux,
};
