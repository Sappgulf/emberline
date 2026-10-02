import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

const url = process.argv[2] ?? "https://emberline-xi.vercel.app";
const target = new URL(url);
assert.ok(target.protocol === "https:" || ["localhost", "127.0.0.1"].includes(target.hostname));
const output = "output/live-smoke";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const reports = [];
try {
  for (const [width, height] of [[1440, 1000], [390, 844]]) {
    // Every new page has its own browser context; no player save is read or seeded.
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    const advance = ms => page.evaluate(ms => window.advanceTime(ms), ms);
    const cell = async (column, row) => {
      const box = await page.locator("canvas").boundingBox();
      assert.ok(box);
      await page.mouse.click(box.x + (column + 0.5) * box.width / 13,
        box.y + (row + 0.5) * box.height / 9);
    };
    const response = await page.goto(url, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => typeof window.render_game_to_text === "function");
    assert.equal((await state()).phase, "title");
    await page.getByRole("button", { name: "Hold the line", exact: true }).click();
    await page.locator(".dispatch .arrival-plan summary").click();
    await page.locator(".dispatch .arrival-entries").waitFor({ state: "visible" });
    assert.equal((await state()).arrivals.reduce((n, group) => n + group.count, 0), 8);
    await page.getByRole("button", { name: "Take the watch", exact: true }).click();
    await page.keyboard.press("3");
    await cell(1, 4);
    await page.keyboard.press("2");
    await cell(3, 4);
    await page.locator(".command-send").click();
    for (let i = 0; i < 240 && (await state()).phase === "wave"; i++) await advance(100);
    assert.equal((await state()).phase, "ready");
    assert.ok((await state()).lastResult.ledger.some(entry => entry.source === "mortar"));
    await page.keyboard.press("1");
    await cell(5, 4);
    await cell(3, 4);
    await page.keyboard.press("q");
    await page.locator(".command-send").click();
    for (let i = 0; i < 240 && !(await state()).rally.ready; i++) await advance(100);
    assert.equal((await state()).phase, "wave");
    assert.equal((await state()).rally.charge, 100);
    await page.locator(".command-rally").click();
    assert.equal((await state()).rally.uses, 1);
    assert.equal((await state()).rally.charge, 0);
    assert.ok((await state()).rally.seconds > 0);
    await page.keyboard.press("p");
    const paused = await state();
    await advance(1000);
    assert.equal((await state()).rally.seconds, paused.rally.seconds);
    assert.deepEqual((await state()).arrivals, paused.arrivals);
    const enemy = paused.creeps[0];
    if (enemy) {
      await cell(Math.floor(enemy.x), Math.floor(enemy.y));
      assert.ok((await state()).prey?.hp > 0);
      await page.getByRole("meter", { name: "Focused enemy health" }).waitFor();
    }
    await page.waitForTimeout(250); // Let the focus disclosure finish its entrance animation.
    await page.screenshot({ path: `${output}/${width}x${height}-rally.png` });
    await page.keyboard.press("p");
    for (let i = 0; i < 240 && (await state()).phase === "wave"; i++) await advance(100);
    const held = await state();
    assert.equal(held.phase, "ready");
    assert.equal(held.lastResult.rallies, 1);
    assert.equal(held.keep.lives, 20);
    await page.keyboard.press("?");
    await page.locator(".dispatch .arrival-plan summary").click();
    await page.locator(".dispatch .arrival-entries").waitFor({ state: "visible" });
    const reading = await state();
    await advance(1000);
    assert.deepEqual((await state()).arrivals, reading.arrivals);
    await page.locator(".dispatch .arrival-note").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/${width}x${height}-arrivals.png` });
    await page.locator(".dispatch .arrival-plan summary").click();
    await page.locator(".dispatch .battle-ledger summary").click();
    await page.locator(".dispatch .ledger-note").waitFor({ state: "visible" });
    await page.screenshot({ path: `${output}/${width}x${height}-ledger.png` });
    await page.keyboard.press("Escape");
    const geometry = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));
    assert.ok(geometry.width <= width && geometry.height <= height);
    assert.deepEqual(errors, []);
    reports.push({ viewport: `${width}x${height}`, wave: held.wave.current,
      lives: held.keep.lives, rallies: held.lastResult.rallies, ledger: held.lastResult.ledger, errors });
    await page.close();
  }
  const assetContext = await browser.newContext();
  for (const [path, hash] of [
    ["/assets/sprites/runner-gallop-v1.webp", "141a33c0393c1b3a9104528746d41370076ebfd563e699ca24bf6ef31a88e75d"],
    ["/assets/tiles/ash-floor-v1.webp", "367abccf102b24607081856211354063cdb170533e744daf98c106b78d2f65ec"],
  ]) {
    const response = await assetContext.request.get(new URL(path, url).href);
    assert.equal(response.status(), 200);
    assert.equal(createHash("sha256").update(await response.body()).digest("hex"), hash);
  }
  await assetContext.close();
} finally {
  await browser.close();
}
fs.writeFileSync(`${output}/verdict.json`, JSON.stringify({ url, reports }, null, 2));
console.log(JSON.stringify({ url, reports }, null, 2));
