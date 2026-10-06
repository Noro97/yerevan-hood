import puppeteer from "puppeteer-core";

const DEFAULT_CHROME = {
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
};

export async function launchBrowser() {
  return puppeteer.launch({
    executablePath: process.env.CHROME_PATH ?? DEFAULT_CHROME[process.platform],
    headless: "new",
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
  });
}

/**
 * Opens the game, enters GameplayScene with a fixed seed and pauses the real-time ticker,
 * so the spec drives the simulation with app.step(). Page errors are collected in `errors`.
 */
export async function openGame(browser, baseUrl, { seed = 1234 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.clear();
    } catch {
      // storage may be unavailable; the game does not need it
    }
  });
  await page.goto(`${baseUrl}/?test`, { waitUntil: "load" });
  await page.waitForFunction(() => !document.getElementById("loading"), { timeout: 30000 });
  await page.keyboard.press("KeyQ");
  await page.waitForFunction(() => window.__game?.scene?.app, { timeout: 10000 });
  await page.evaluate(async (s) => {
    const [{ rng }, { GameplayScene }] = await Promise.all([
      import("/src/core/Random.js"),
      import("/src/scenes/GameplayScene.js"),
    ]);
    const app = window.__game.scene.app;
    app.paused = true;
    rng.seed(s);
    app.scenes.switchScene(new GameplayScene());
  }, seed);
  return { page, errors };
}
