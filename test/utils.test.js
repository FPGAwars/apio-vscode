// Unit tests of utils.js. Run them the same way as extension.test.js.

// Standard imports
const assert = require("assert");

// Local imports
const utils = require("../src/utils.js");
const platforms = require("../src/platforms.js");

suite("utils.shellSafe()", () => {
  test("safe strings are returned as is", () => {
    assert.strictEqual(utils.shellSafe("apio"), "apio");
    assert.strictEqual(
      utils.shellSafe("/home/user/.apio/bin/apio"),
      "/home/user/.apio/bin/apio",
    );
    assert.strictEqual(utils.shellSafe("a-b_c.d/0-9"), "a-b_c.d/0-9");
  });

  test("strings with unsafe chars are quoted", () => {
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

  test("empty string is quoted", () => {
    assert.strictEqual(utils.shellSafe(""), '""');
  });

  test("backslash and colon are safe only on windows", () => {
    const winPath = "C:\\Users\\john\\.apio\\bin\\apio.exe";
    if (platforms.isWindows()) {
      assert.strictEqual(utils.shellSafe(winPath), winPath);
    } else {
      assert.strictEqual(utils.shellSafe(winPath), `"${winPath}"`);
    }
  });
});
