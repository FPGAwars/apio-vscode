// Unit tests of utils.js. Run them the same way as extension.test.js.

// Standard imports
const assert = require("assert");

// Local imports
const utils = require("../src/utils.js");
const platforms = require("../src/platforms.js");

suite("Utils tests", () => {
  test("test-shell-safe-safe-chars", () => {
    assert.strictEqual(utils.shellSafe("apio"), "apio");
    assert.strictEqual(
      utils.shellSafe("/home/user/.apio/bin/apio"),
      "/home/user/.apio/bin/apio",
    );
    assert.strictEqual(utils.shellSafe("a-b_c.d/0-9"), "a-b_c.d/0-9");
  });

  test("test-shell-safe-unsafe-chars", () => {
    assert.strictEqual(
      utils.shellSafe("/home/John Smith/.apio/bin/apio"),
      '"/home/John Smith/.apio/bin/apio"',
    );
    assert.strictEqual(
      utils.shellSafe("/Users/o'brien/.apio/bin/apio"),
      "\"/Users/o'brien/.apio/bin/apio\"",
    );
    assert.strictEqual(utils.shellSafe("a&b"), '"a&b"');
    assert.strictEqual(utils.shellSafe("a$b"), '"a$b"');
  });

  test("test-shell-safe-empty-string", () => {
    assert.strictEqual(utils.shellSafe(""), '""');
  });

  test("test-shell-safe-windows-chars", () => {
    const winPath = "C:\\Users\\john\\.apio\\bin\\apio.exe";
    if (platforms.isWindows()) {
      assert.strictEqual(utils.shellSafe(winPath), winPath);
    } else {
      assert.strictEqual(utils.shellSafe(winPath), `"${winPath}"`);
    }
  });
});
