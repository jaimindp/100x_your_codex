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

    await page.click('.nav-btn[data-screen="usage"]');
    await page.waitForSelector('.screen-panel[data-screen-panel="usage"].is-active', {
      timeout: 15000
    });

    results.checks.windowSelectPresent = (await page.locator("#usage-window-select").count()) === 1;
    results.checks.refreshButtonPresent = (await page.locator("#usage-refresh-btn").count()) === 1;
    results.checks.modelChartPresent = (await page.locator("#usage-model-chart").count()) === 1;
    results.checks.effortChartPresent = (await page.locator("#usage-effort-chart").count()) === 1;
    results.checks.timeChartPresent = (await page.locator("#usage-time-chart").count()) === 1;

    await page.waitForFunction(() => {
      const btn = document.querySelector("#usage-refresh-btn");
      const select = document.querySelector("#usage-window-select");
      return Boolean(btn && select && !btn.disabled && !select.disabled);
    }, null, { timeout: 90000 });

    await page.selectOption("#usage-window-select", "7");

    await page.waitForFunction(() => {
      const status = (document.querySelector("#usage-status")?.textContent || "").toLowerCase();
      return status.includes("window") || status.includes("error") || status.includes("unavailable");
    }, null, { timeout: 90000 });

    const statusText = ((await page.locator("#usage-status").textContent()) || "").trim();
    const summaryText = ((await page.locator("#usage-summary").textContent()) || "").trim();
    const modelChartText = ((await page.locator("#usage-model-chart").textContent()) || "").trim();
    const effortChartText = ((await page.locator("#usage-effort-chart").textContent()) || "").trim();
    const timeChartText = ((await page.locator("#usage-time-chart").textContent()) || "").trim();

    results.status.usageStatus = statusText;
    results.status.summarySample = summaryText.slice(0, 300);
    results.status.modelSample = modelChartText.slice(0, 300);
    results.status.effortSample = effortChartText.slice(0, 300);
    results.status.timeSample = timeChartText.slice(0, 300);

    const statusLower = statusText.toLowerCase();
    results.checks.statusMentionsWindow = statusLower.includes("window") || statusLower.includes("error");
    results.checks.summaryRendered = summaryText.length > 0;
    results.checks.modelChartRendered = modelChartText.length > 0;
    results.checks.effortChartRendered = effortChartText.length > 0;
    results.checks.timeChartRendered = timeChartText.length > 0;

    const screenshotPath = path.resolve("electron-usage-breakdown-verification.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    results.artifacts.screenshot = screenshotPath;

    const outputPath = path.resolve("electron-usage-breakdown-verification.json");
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
