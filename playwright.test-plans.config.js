const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './test_plans',
    timeout: 50_000,
    reporter: 'html',
    use: {
        browserName: 'chromium',
        headless: false,
        screenshot: 'on',
        trace: 'on',
    },
});
