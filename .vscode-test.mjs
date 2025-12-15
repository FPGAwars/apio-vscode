import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'test/**/*.test.js',
	// mocha: {
	// 	// 5 secs timeout per test (default is 2 secs). Can also be overridden 
	// 	// in the test itself.
    //     timeout: 5000  
    // }
});
