import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:8080";
const target = new URL(url);
assert.ok(
  ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname),
  "Use a local game server: this suite seeds test saves",
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
fs.mkdirSync("output/audit", { recursive: true });
const reports = [];
try {
  for (const [width, height, reduced] of [
    [1440, 1000, false],
    [1280, 720, false],
    [390, 844, false],
    [320, 568, false],
    [844, 390, false],
    [390, 844, true],
  ]) {
    const id = `${width}x${height}${reduced ? "-reduced" : ""}`;
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    const advance = (ms) => page.evaluate((ms) => window.advanceTime(ms), ms);
    const cell = async (c, r, click = true) => {
      const b = await page.locator("canvas").boundingBox();
      const x = b.x + ((c + 0.5) * b.width) / 13,
        y = b.y + ((r + 0.5) * b.height) / 9;
      if (click) await page.mouse.click(x, y);
      else await page.mouse.move(x, y);
    };
    await page.goto(url);
    await page.waitForFunction(() => typeof window.render_game_to_text === "function");
    await page.getByRole("button", { name: "Campaign", exact: true }).focus();
    await page.keyboard.press("Space");
    assert.equal(
      (await state()).phase,
      "title",
      "Space activates Campaign instead of starting a watch",
    );
    assert.equal((await state()).campaign, true);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Bestiary", exact: true }).click();
    await page.getByRole("tab", { name: "Bestiary", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page.getByRole("tab", { name: /^Chronicle/ }).getAttribute("aria-selected"),
      "true",
    );
    await page.keyboard.press("Home");
    assert.equal(
      await page.getByRole("tab", { name: "Bestiary", exact: true }).getAttribute("aria-selected"),
      "true",
    );
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^Watch hall/ }).click();
    await page
      .getByText("Hold all eight roads to open the endless night.", { exact: true })
      .waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    await page.screenshot({ path: `output/audit/${id}-title.png` });
    await page.getByRole("button", { name: "Hold the line", exact: true }).click();
    await page.getByRole("button", { name: "Take the watch", exact: true }).click();
    if (reduced) {
      await page.waitForTimeout(600);
      const before = await page.locator("canvas").evaluate(canvas => canvas.toDataURL());
      await advance(1000);
      await page.waitForTimeout(100);
      const after = await page.locator("canvas").evaluate(canvas => canvas.toDataURL());
      assert.equal(after, before, "decorative battlefield motion must stop with reduced motion");
    }
    await page.keyboard.press("3");
    await cell(1, 4, false);
    await page.waitForTimeout(80);
    assert.match(await page.locator("body").innerText(), /road tiles in reach/);
    await cell(1, 4);
    await page.keyboard.press("2");
    await cell(3, 4);
    assert.equal((await state()).towers.length, 2);
    const guide = page.locator(".reaction-guide summary");
    if (await guide.isVisible()) {
      await guide.focus();
      await page.keyboard.press("Space");
      assert.equal(
        (await state()).phase,
        "ready",
        "Space expands the guide instead of sending a wave",
      );
      await page
        .getByText("Heavy hits deal 30% more damage to frost-chilled prey.", { exact: true })
        .waitFor({ state: "visible" });
      await guide.focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.locator(".reaction-guide").getAttribute("open"), null);
    } else {
      // The established short-landscape layout uses Orders instead of the forecast.
      await page.keyboard.press("?");
      await page
        .getByText(
          "Frost chills prey; Mortar or Pike hits it 30% harder. Once per enemy every two seconds.",
          { exact: true },
        )
        .scrollIntoViewIfNeeded();
      await page.keyboard.press("Escape");
    }
    await page.locator(".command-send").click();
    assert.equal((await state()).phase, "wave");
    let reaction = false;
    for (let i = 0; i < 120; i++) {
      await advance(100);
      if ((await state()).reactions.triggered > 0) {
        reaction = true;
        break;
      }
    }
    assert.ok(reaction, `${id}: Frost + Mortar should produce Shatter during real combat`);
    await page.screenshot({ path: `output/audit/${id}-live.png` });
    await page.keyboard.press("?");
    const reading = await state();
    await advance(2000);
    assert.deepEqual((await state()).creeps, reading.creeps, "reading Orders must suspend combat");
    await page.keyboard.press("Escape");
    await page.keyboard.press("p");
    const paused = await state();
    await advance(1000);
    assert.deepEqual((await state()).creeps, paused.creeps);
    await page.waitForTimeout(80);
    await page.screenshot({ path: `output/audit/${id}-combat.png` });
    const prey = (await state()).creeps[0];
    if (prey) {
      await cell(Math.floor(prey.x), Math.floor(prey.y));
      assert.ok((await state()).focus);
    }
    await page.keyboard.press("p");
    await page.keyboard.press("k");
    assert.equal((await state()).scoutReady, false);
    for (let i = 0; i < 150 && (await state()).phase === "wave"; i++) await advance(200);
    const held = await state();
    assert.equal(held.phase, "ready");
    assert.ok(held.lastResult.reactions > 0);
    await page.keyboard.press("s");
    assert.equal((await state()).phase, "stall");
    await page.getByRole("button", { name: "Back to the road", exact: true }).click();
    await page.keyboard.press("3");
    await cell(1, 4);
    // Selecting an occupied tower keeps it intact and exposes its upgrades.
    assert.equal((await state()).selectedTower.kind, "frost");
    await page.keyboard.press("q");
    assert.equal((await state()).selectedTower.damageLevel, 2);
    await page.keyboard.press("f");
    assert.equal((await state()).controls.speed, 2);
    await page.keyboard.press("f");
    assert.equal((await state()).controls.speed, 3);
    await page.keyboard.press("f");
    await page.keyboard.press("Escape");
    await page.keyboard.press("3");
    await cell(3, 3, false);
    await page.waitForTimeout(100);
    await page.screenshot({ path: `output/audit/${id}-planning.png` });
    const geometry = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    }));
    assert.ok(geometry.scrollWidth <= width, `${id}: horizontal overflow`);
    assert.ok(geometry.scrollHeight <= height, `${id}: vertical overflow`);
    assert.deepEqual(errors, [], `${id}: browser errors`);
    reports.push({
      id,
      reactions: held.lastResult.reactions,
      lives: held.keep.lives,
      geometry,
      errors,
    });
    fs.writeFileSync(
      `output/audit/${id}-verdict.json`,
      JSON.stringify(reports[reports.length - 1], null, 2),
    );
    if (id === "1440x1000") {
      await page.keyboard.press("1");
      await cell(5, 4);
      assert.equal((await state()).towers.length, 3);
      for (let wave = 2; wave <= 5; wave++) {
        await cell(3, 4);
        const damage = page.locator(".upgrade-action-damage");
        if (await damage.isEnabled()) await damage.click();
        const ability = page.locator(".ability-action");
        if (await ability.isEnabled()) await ability.click();
        await page.locator(".command-send").click();
        for (let i = 0; i < 240 && (await state()).phase === "wave"; i++) await advance(250);
        assert.equal(
          (await state()).phase,
          wave === 5 ? "shop" : "ready",
          `complete the opening road's wave ${wave}`,
        );
      }
      const lives = (await state()).keep.lives;
      await page.screenshot({ path: "output/audit/first-road-held.png" });
      const relic = page.locator(".relic-card:enabled").first();
      await relic.click();
      assert.equal(await page.locator('.relic-card[data-held="true"]').count(), 1);
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("emberline-watch")));
      assert.equal(saved.unlocked, 1);
      assert.equal(saved.relics.length, 1);
      await page.getByRole("button", { name: /^Bank the coals:/ }).click();
      await page.getByRole("button", { name: "March on", exact: true }).click();
      await page.getByRole("button", { name: "Take the watch", exact: true }).click();
      assert.equal((await state()).map, "Pine Cut");
      assert.equal((await state()).camp, "Bank the coals");
      assert.deepEqual(errors, []);
      reports.push({ id: "first-road-complete", lives, nextMap: (await state()).map, errors });
    }
    await page.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(url);
    await page.waitForFunction(() => typeof window.render_game_to_text === "function");
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    await page.getByRole("button", { name: "Hold the line", exact: true }).click();
    await page.getByRole("radio", { name: /Spare timber/ }).click();
    await page.getByRole("button", { name: "Take the watch", exact: true }).click();
    assert.equal((await state()).keep.lives, 22);
    assert.equal((await state()).keep.maxLives, 22);
    // Deliberately leave the road undefended to test genuine defeat and recovery.
    for (let wave = 0; wave < 3 && (await state()).phase !== "lost"; wave++) {
      await page.locator(".command-send").click();
      for (let i = 0; i < 80 && (await state()).phase === "wave"; i++)
        await page.evaluate(() => window.advanceTime(1000));
    }
    assert.equal((await state()).phase, "lost");
    await page.screenshot({ path: "output/audit/defeat-mobile.png" });
    await page.getByRole("button", { name: "Hold this map", exact: true }).click();
    await page.getByRole("button", { name: "Take the watch", exact: true }).click();
    assert.equal((await state()).phase, "ready");
    assert.equal((await state()).keep.lives, 22);
    assert.deepEqual(errors, []);
    reports.push({
      id: "defeat-retry-timber",
      phase: (await state()).phase,
      lives: (await state()).keep.lives,
      errors,
    });
    await page.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(url);
    await page.waitForFunction(() => typeof window.render_game_to_text === "function");
    await page.evaluate(() =>
      localStorage.setItem(
        "emberline-watch",
        JSON.stringify({ unlocked: 8, marks: 10, bestEndless: 4, relics: [] }),
      ),
    );
    await page.reload();
    await page.waitForFunction(() => typeof window.render_game_to_text === "function");
    await page.getByRole("button", { name: /^Watch hall/ }).click();
    await page.getByRole("button", { name: "Walk the Long Night", exact: true }).click();
    await page.getByRole("button", { name: "Take the watch", exact: true }).click();
    const state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert.equal(state.endless, true);
    assert.equal(state.bestEndless, 4);
    assert.equal(state.phase, "ready");
    assert.equal(await page.getByText("Now · night 1", {exact: true}).count(), 1);
    assert.equal(await page.locator(".desk-next").filter({hasText: "Next road"}).count(), 0);
    await page.screenshot({ path: "output/audit/endless-ready.png" });
    assert.deepEqual(errors, []);
    reports.push({ id: "endless-resume", endless: state.endless, best: state.bestEndless, errors });
    await page.close();
  }
  // Seed an earned campaign save in a fresh context; never change an actual player save.
  for (let index = 0; index < 8; index++) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.addInitScript(() =>
      localStorage.setItem(
        "emberline-watch",
        JSON.stringify({
          unlocked: 8,
          marks: 10,
          relics: [],
          perks: { purse: 0, wall: 0, whet: 0, rest: 0 },
        }),
      ),
    );
    await page.goto(url);
    await page.waitForFunction(() => typeof window.render_game_to_text === "function");
    await page.getByRole("button", { name: "Campaign", exact: true }).click();
    await page.locator(".campaign-select button").nth(index).click();
    await page.getByRole("button", { name: /^Begin / }).click();
    await page.getByRole("button", { name: "Take the watch", exact: true }).click();
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    const box = await page.locator("canvas").boundingBox();
    for (let r = 0; r < 9 && (await state()).towers.length === 0; r++) {
      for (let c = 0; c < 13 && (await state()).towers.length === 0; c++) {
        await page.mouse.click(
          box.x + ((c + 0.5) * box.width) / 13,
          box.y + ((r + 0.5) * box.height) / 9,
        );
      }
    }
    assert.equal((await state()).towers.length, 1);
    await page.keyboard.press("Space");
    assert.equal((await state()).phase, "wave");
    await page.evaluate(() => window.advanceTime(1200));
    await page.screenshot({ path: `output/audit/road-${index + 1}.png` });
    assert.deepEqual(errors, []);
    reports.push({
      id: `road-${index + 1}`,
      map: (await state()).map,
      phase: (await state()).phase,
      errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync("output/audit/verdict.json", JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
