const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

    page.on('request', req => {
      if (!req.url().includes('vite')) console.log('NETWORK REQ:', req.method(), req.url());
    });
    page.on('response', res => {
      if (!res.url().includes('vite')) console.log('NETWORK RES:', res.status(), res.url());
    });
    page.on('requestfailed', req => {
      if (!req.url().includes('vite')) console.error('NETWORK FAILED:', req.url(), req.failure()?.errorText);
    });

    await page.goto('http://localhost:5173');
    await new Promise(r => setTimeout(r, 1000));

    // Type URL
    await page.evaluate(() => {
      const input = document.querySelector('.glass-input');
      if (input) {
        input.value = '';
        input.focus();
      }
    });
    await page.keyboard.type('https://httpbin.org/get?testing=api360');

    const tabs = await page.$$('button');
    for (const btn of tabs) {
      if ((await page.evaluate(el => el.textContent, btn)) === 'Contract') {
        await btn.click();
        console.log("Clicked Contract Tab");
        break;
      }
    }
    await new Promise(r => setTimeout(r, 200));

    // Fill Contract details
    await page.evaluate(() => {
      const schema = `{
  "type": "object",
  "properties": {
    "args": {
      "type": "object",
      "properties": {
        "testing": { "type": "string" }
      },
      "required": ["testing"]
    }
  },
  "required": ["args"]
}`;
      window._DEBUG_SCHEMA = schema;
      // In react, Monaco editor isn't a simple textarea. Just trigger standard behavior
    });

    // Click Send
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const txt = await page.evaluate(el => el.textContent, btn);
      if (txt && txt.trim() === 'Send') {
        await btn.click();
        console.log("Clicked Send!!!");
        break;
      }
    }

    await new Promise(r => setTimeout(r, 3000));
    console.log("=== BODY AFTER REQUEST ===");
    console.log(await page.evaluate(() => document.body.innerText));

    await browser.close();
  } catch (e) {
    console.error("SCRIPT ERROR", e);
  }
})();
