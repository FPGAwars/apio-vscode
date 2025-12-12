// Minimal, robust JSON file I/O utilities for VS Code extensions

import * as fs from "fs";
import * as path from "path";

/**
 * Writes an object to a JSON file.
 * Creates parent directories if needed.
 * @param {string} filePath
 * @param {object} dict
 * @returns {Promise<boolean>} true on success, false on any error
 */
export async function writeJson(filePath, dict) {
  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    const content = JSON.stringify(dict, null, 4) + "\n";
    await fs.promises.writeFile(filePath, content, "utf8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a JSON file.
 * Returns parsed object or empty object {} on any error (missing file, invalid JSON, etc.).
 * @param {string} filePath
 * @returns {Promise<object>}
 */
export async function readJson(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, "utf8");
    return data.trim() ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}
