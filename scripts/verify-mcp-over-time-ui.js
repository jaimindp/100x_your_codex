const fs = require("node:fs/promises");
const path = require("node:path");
const { _electron: electron } = require("playwright");

async function run() {
  const repoRoot = path.resolve(".");
  const app = await electron.launch({ args: [repoRoot] });
  const results = {
    checks: {},
    status: {},
    artifacts: {}
  };

  try {
    const page = await app.firstWindow();
    await page.waitForFunction(() => document.readyState === "complete", null, { timeout: 60000 });

    await page.click('.nav-btn[data-screen="mcp-skills"]');
    await page.waitForSelector('.screen-panel[data-screen-panel="mcp-skills"].is-active', {
      timeout: 15000
    });

    results.checks.windowSelectPresent = (await page.locator("#mcp-days-input").count()) === 1;
    results.checks.refreshButtonPresent = (await page.locator("#mcp-refresh-btn").count()) === 1;
    results.checks.overTimeChartPresent = (await page.locator("#mcp-over-time").count()) === 1;

    await page.waitForFunction(() => {
      const btn = document.querySelector("#mcp-refresh-btn");
      const select = document.querySelector("#mcp-days-input");
      return Boolean(btn && select && !btn.disabled && !select.disabled);
    }, null, { timeout: 90000 });

    await page.selectOption("#mcp-days-input", "30");

    await page.waitForFunction(() => {
      const status = (document.querySelector("#mcp-status")?.textContent || "").toLowerCase();
      return status.includes("30 day") || status.includes("error") || status.includes("empty");
    }, null, { timeout: 90000 });

    const statusText = ((await page.locator("#mcp-status").textContent()) || "").trim();
    const overTimeText = ((await page.locator("#mcp-over-time").textContent()) || "").trim();

    results.status.mcpStatus = statusText;
    results.status.overTimeSample = overTimeText.slice(0, 300);

    results.checks.statusHasWindowData = statusText.toLowerCase().includes("30 day");
    results.checks.overTimeRendered = overTimeText.length > 0;

    const screenshotPath = path.resolve("electron-mcp-over-time-verification.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    results.artifacts.screenshot = screenshotPath;

    const outputPath = path.resolve("electron-mcp-over-time-verification.json");
    await fs.writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`);
    results.artifacts.output = outputPath;

    console.log(JSON.stringify(results, null, 2));

    const failures = Object.entries(results.checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);
    if (failures.length) {
      throw new Error(`Verification failed checks: ${failures.join(", ")}`);
    }
  } finally {
    await app.close();
  }
}

run().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
