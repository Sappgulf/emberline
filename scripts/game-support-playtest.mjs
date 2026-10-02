import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8081";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(url).hostname), "Local only: seeds an isolated campaign save");
const output = "output/support";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const reports = [];
try {
  for (const [width, height, salt] of [[1440, 1000, false], [390, 844, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: salt ? "reduce" : "no-preference" });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    await page.addInitScript(salt => localStorage.setItem("emberline-watch", JSON.stringify({ unlocked: 1, marks: 0, relics: salt ? ["salt"] : [] })), salt);
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    const advance = ms => page.evaluate(ms => window.advanceTime(ms), ms);
    const cell = async (c, r) => {
      const box = await page.locator("canvas").boundingBox();
      await page.mouse.click(box.x + (c + 0.5) * box.width / 13, box.y + (r + 0.5) * box.height / 9);
    };
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.render_game_to_text === "function");
    await page.getByRole("button", { name: "Campaign", exact: true }).click();
    await page.locator(".campaign-select button").nth(1).click();
    await page.getByRole("button", { name: /^Begin / }).click();
    await page.getByRole("button", { name: "Take the watch", exact: true }).click();
    await cell(2, 2);
    await page.keyboard.press("4"); await cell(3, 6);
    await page.keyboard.press("3"); await cell(5, 4);
    assert.equal((await state()).towers.length, 3);
    for (let wave = 1; wave <= 2; wave++) {
      await page.locator(".command-send").click();
      for (let i = 0; i < 300 && (await state()).phase === "wave"; i++) await advance(200);
      assert.equal((await state()).phase, "ready");
    }
    await page.locator(".command-send").click();
    let shaman;
    for (let i = 0; i < 60; i++) {
      await advance(100);
      shaman = (await state()).creeps.find(c => c.kind === "shaman" && c.x > 0.5 && c.song.seconds <= 0.3);
      if (shaman) break;
    }
    assert.ok(shaman, "real authored wave reaches the song windup");
    await page.keyboard.press("p");
    const stopped = (await state()).creeps.find(c => c.id === shaman.id);
    await cell(stopped.x - 0.5, stopped.y - 0.5);
    const focused = await state();
    assert.equal(focused.focus.kind, "shaman");
    assert.equal(focused.prey.song.healing, salt ? 5 : 10);
    assert.equal(focused.prey.song.radius, 1.45);
    await page.locator(".prey-song").waitFor();
    assert.match(await page.locator(".prey-song").innerText(), new RegExp(`Song in .*s · \\+${salt ? 5 : 10} hp`));
    await advance(1000);
    assert.deepEqual((await state()).prey.song, focused.prey.song);
    await page.waitForTimeout(250);
    const box = await page.locator(".focus-chip").boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height);
    await page.screenshot({ path: `${output}/${width}-song.png` });
    await page.keyboard.press("p");
    await advance(650);
    const after = await state();
    assert.ok(after.prey.song.seconds > focused.prey.song.seconds, "cast resets the displayed timer");
    assert.deepEqual(errors, []);
    reports.push({ width, height, salt, before: focused.prey, after: after.prey, errors });
    await page.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(`${output}/verdict.json`, JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
