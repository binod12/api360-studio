import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', error => console.error('BROWSER ERROR:', error));

    try {
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    } catch (e) {
        console.error("GOTO ERROR", e);
    }

    await browser.close();
})();
