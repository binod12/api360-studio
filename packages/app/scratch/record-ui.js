import { spawn } from 'child_process';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const PORT_DEV = 5173;
const PORT_API = 3001;

async function main() {
  console.log("1. Starting Mock Todo API server on port " + PORT_API);
  const apiProcess = spawn('node', ['scratch/todo-api.js'], { stdio: 'inherit' });

  console.log("2. Starting Vite Dev Server on port " + PORT_DEV);
  const devProcess = spawn('npm', ['run', 'dev', '--', '--strictPort'], { stdio: 'inherit' });

  // Bounded wait for servers to boot
  console.log("Waiting for servers to boot...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log("3. Launching Playwright browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: {
      dir: './scratch/recordings',
      size: { width: 1280, height: 720 }
    },
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  try {
    console.log("4. Navigating to http://localhost:" + PORT_DEV);
    await page.goto(`http://localhost:${PORT_DEV}`);
    await page.waitForLoadState('networkidle');

    // Step A: Set URL to mock vulnerable route
    console.log("Step A: Inputting URL http://localhost:3001/todo?id=1");
    const urlInput = page.locator('input[placeholder="Enter request URL"]');
    await urlInput.clear();
    await urlInput.fill(`http://localhost:${PORT_API}/todo?id=1`);
    await page.waitForTimeout(1500);

    // Step B: Send Request & view response
    console.log("Step B: Clicking Send...");
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(2000);

    // Step C: Open Load Test Modal & Run load test
    console.log("Step C: Opening Load Test Modal...");
    await page.click('button:has-text("Load Test")');
    await page.waitForTimeout(1000);

    console.log("Setting load configs & starting traffic...");
    const vusersInput = page.locator('input[type="number"]').nth(0);
    await vusersInput.fill('5');
    const iterInput = page.locator('input[type="number"]').nth(1);
    await iterInput.fill('10');
    await page.click('button:has-text("Start Traffic")');
    await page.waitForTimeout(5000); // wait for completion

    console.log("Closing Load Test Modal...");
    await page.click('h2:has-text("Performance Load Runner") + button');
    await page.waitForTimeout(1000);

    // Step D: Open Security Scanner & launch scan
    console.log("Step D: Opening Security Scan Modal...");
    await page.click('button:has-text("Scan API")');
    await page.waitForTimeout(1000);

    console.log("Adding fuzzer param key 'id' and value '1'...");
    // Let's click the Launch Scan button which will run with default param list
    console.log("Launching scan fuzzer...");
    await page.click('button:has-text("Launch Scan")');
    await page.waitForTimeout(5000); // wait for scanner

    console.log("Closing Security Scan Modal...");
    await page.click('h2:has-text("Automated Security Scanner") + button');
    await page.waitForTimeout(1000);

    // Step E: Switch to Designer View
    console.log("Step E: Switching to Designer Mode...");
    await page.click('button:has-text("Designer")');
    await page.waitForTimeout(3000);

    // Step F: Switch back to Client Mode
    console.log("Step F: Returning to Client Mode...");
    await page.click('button:has-text("Client")');
    await page.waitForTimeout(1500);

  } catch (err) {
    console.error("UI Automation error occurred:", err);
  } finally {
    console.log("Closing browser and finalizing video...");
    await context.close();
    await browser.close();

    console.log("Terminating servers...");
    apiProcess.kill('SIGINT');
    devProcess.kill('SIGINT');
  }

  // Find and copy recording
  const recordDir = './scratch/recordings';
  if (fs.existsSync(recordDir)) {
    const files = fs.readdirSync(recordDir);
    const video = files.find(f => f.endsWith('.webm'));
    if (video) {
      const src = path.join(recordDir, video);
      const dest = '/Users/managersahab/.gemini/antigravity/brain/f2a25d3c-9c07-4953-addd-5c725f5249c0/todo_ui_workflow.webm';
      fs.copyFileSync(src, dest);
      console.log(`\n✓ Video screen recording saved successfully to: ${dest}`);
      
      // Also clean up temp recordings folder
      fs.rmSync(recordDir, { recursive: true, force: true });
    } else {
      console.error("Error: Video recording was not saved by Playwright!");
    }
  }
}

main().catch(err => {
  console.error("Fatal launcher error:", err);
});
