const { defineConfig } = require('@vscode/test-cli');
const path = require('path');

module.exports = defineConfig({
    files: 'test/**/*.test.js',
    workspaceFolder: path.resolve(__dirname, '.vscode-test/workspace'),
    mocha: {
        // Global timeout of 5000 milliseconds (5 seconds) for each test.
        // The default Mocha timeout is 2000 milliseconds.
        // This value may be overridden individually within specific tests
        // using this.timeout() if required.
        timeout: 5000
    }
});