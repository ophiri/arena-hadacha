import { test, expect } from "@playwright/test";

async function snapshot(page) {
  return page.evaluate(async () => {
    const { game, session } = await import(new URL("src/game.js", location.href).href);
    return {
      screen: session.screen,
      mode: session.mode,
      state: game.state,
      elapsed: game.elapsed,
      winner: game.winner?.id || null,
      projectiles: game.projectiles.map(projectile => projectile.kind),
      fighters: game.fighters.map(fighter => ({
        id: fighter.id,
        slot: fighter.slot,
        x: fighter.x,
        y: fighter.y,
        vx: fighter.vx,
        vy: fighter.vy,
        damage: fighter.damage,
        charge: fighter.charge,
        airJumps: fighter.airJumps,
        attack: fighter.attack?.kind || null,
      })),
    };
  });
}

async function start(page, mode = "local") {
  await page.goto("/");
  await page.getByRole("button", { name: mode === "cpu" ? "מול המחשב" : "קרב מקומי" }).click();
  await page.locator("#fight-button").click();
  await expect(page.locator("#arena-screen")).toBeVisible();
  await expect(page.locator("#overlay")).toBeHidden();
}

async function placeFighters(page, gap = 24) {
  await page.evaluate(async gap => {
    const { game } = await import(new URL("src/game.js", location.href).href);
    Object.assign(game.fighters[0], { x: 420, y: 412, vx: 0, vy: 0, grounded: true, facing: 1 });
    Object.assign(game.fighters[1], { x: 420 + 56 + gap, y: 412, vx: 0, vy: 0, grounded: true, facing: -1 });
  }, gap);
}

test("Hebrew RTL game opens on a real main menu with both play modes and owned assets", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle("ברואליציה — משחק זירה סאטירי");
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "ברואליציה" })).toBeVisible();
  await expect(page.getByRole("button", { name: "מול המחשב" })).toBeVisible();
  await expect(page.getByRole("button", { name: "קרב מקומי" })).toBeVisible();
  await expect(page.locator(".fighter-lineup")).toBeVisible();
  for (const [path, width, height] of [
    ["assets/fighters/bibi-throw.png", 704, 150],
    ["assets/fighters/ben-gvir-portrait.png", 112, 144],
    ["assets/fighters/ben-gvir-idle.png", 704, 150],
    ["assets/fighters/ben-gvir-run.png", 1056, 150],
    ["assets/fighters/ben-gvir-basic.png", 704, 150],
    ["assets/fighters/ben-gvir-charge.png", 704, 150],
    ["assets/fighters/ben-gvir-projectile.png", 144, 72],
    ["assets/fighters/ben-gvir-victory.png", 176, 176],
    ["assets/fighters/projectiles-throw.png", 288, 72],
    ["assets/fighters/gotliv-idle.png", 112, 144],
    ["assets/fighters/gotliv-throw.png", 704, 150],
    ["assets/fighters/gotliv-charge.png", 704, 150],
    ["assets/fighters/gotliv-projectile.png", 144, 72],
    ["assets/fighters/bennett-idle.png", 112, 144],
    ["assets/fighters/bennett-basic.png", 704, 150],
    ["assets/fighters/bennett-charge.png", 704, 150],
    ["assets/fighters/bennett-projectile.png", 144, 72],
  ]) {
    expect(await page.evaluate(async path => {
      const image = new Image();
      image.src = path;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    }, path)).toEqual({ width, height });
  }
  expect(errors).toEqual([]);
});

test("character select shows four fighters and supports a Tally mirror match", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "קרב מקומי" }).click();
  await expect(page.locator(".roster-card")).toHaveCount(4);
  await page.locator("#selected-fighter-0").click();
  await page.getByRole("button", { name: "בחירת טלי גוטליב" }).click();
  await page.getByRole("button", { name: "בחירת טלי גוטליב" }).click();
  await expect(page.locator("#selected-name-0")).toHaveText("טלי גוטליב");
  await expect(page.locator("#selected-name-1")).toHaveText("טלי גוטליב");
  await page.locator("#fight-button").click();
  let state = await snapshot(page);
  expect(state.fighters.map(fighter => fighter.id)).toEqual(["gotliv", "gotliv"]);
  await page.keyboard.press("f");
  await page.clock.runFor(220);
  state = await snapshot(page);
  expect(state.projectiles).toContain("objection");
});

test("computer mode selects an opponent and actively controls player two", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "מול המחשב" }).click();
  await page.getByRole("button", { name: "בחירת נפתלי בנט" }).click();
  await expect(page.locator("#slot-label-1")).toHaveText("מחשב");
  await page.locator("#fight-button").click();
  const before = await snapshot(page);
  expect(before.mode).toBe("cpu");
  await page.clock.runFor(1400);
  const after = await snapshot(page);
  expect(after.fighters[1].x).not.toBeCloseTo(before.fighters[1].x, 0);
  await expect(page.locator("#hud-slot-1")).toHaveText("מחשב");
});

test("both keyboard control sets move, double jump and stop on keyup", async ({ page }) => {
  await page.clock.install();
  await start(page);
  const before = await snapshot(page);
  await page.keyboard.down("d");
  await page.keyboard.down("ArrowLeft");
  await page.clock.runFor(260);
  await page.keyboard.up("d");
  await page.keyboard.up("ArrowLeft");
  const moved = await snapshot(page);
  expect(moved.fighters[0].x).toBeGreaterThan(before.fighters[0].x + 25);
  expect(moved.fighters[1].x).toBeLessThan(before.fighters[1].x - 25);
  await page.clock.runFor(300);
  const stopped = await snapshot(page);
  expect(Math.abs(stopped.fighters[0].vx)).toBeLessThan(1);
  expect(Math.abs(stopped.fighters[1].vx)).toBeLessThan(1);
  await page.keyboard.down("w");
  await page.keyboard.down("ArrowUp");
  await page.clock.runFor(150);
  await page.keyboard.up("w");
  await page.keyboard.up("ArrowUp");
  const jumped = await snapshot(page);
  expect(jumped.fighters[0].y).toBeLessThan(stopped.fighters[0].y - 35);
  expect(jumped.fighters[1].y).toBeLessThan(stopped.fighters[1].y - 35);
  await page.keyboard.down("w");
  await page.keyboard.down("ArrowUp");
  await page.clock.runFor(45);
  const doubleJumped = await snapshot(page);
  await page.keyboard.up("w");
  await page.keyboard.up("ArrowUp");
  expect(doubleJumped.fighters[0].airJumps).toBe(0);
  expect(doubleJumped.fighters[1].airJumps).toBe(0);
});

test("basic and held charge attacks update damage, meters and knockback", async ({ page }) => {
  await page.clock.install();
  await start(page);
  await placeFighters(page);
  await page.keyboard.press("f");
  await page.clock.runFor(170);
  let state = await snapshot(page);
  expect(state.fighters[1].damage).toBe(9);
  await expect(page.locator("#damage-ben-gvir")).toHaveText("9%");

  await placeFighters(page, 30);
  await page.keyboard.down("g");
  await page.clock.runFor(2200);
  state = await snapshot(page);
  expect(state.fighters[0].attack).toBe("charging");
  expect(state.fighters[0].charge).toBeCloseTo(1.5, 2);
  await expect(page.locator("#panel-bibi")).toHaveClass(/is-maxed/);
  await page.keyboard.up("g");
  await page.clock.runFor(170);
  state = await snapshot(page);
  expect(state.fighters[1].damage).toBeGreaterThanOrEqual(36);
  expect(state.fighters[1].vx).toBeGreaterThan(600);
});

test("pause, help and blur clear held input without advancing the fight", async ({ page }) => {
  await page.clock.install();
  await start(page);
  await page.keyboard.down("d");
  await page.clock.runFor(160);
  await page.keyboard.press("p");
  const paused = await snapshot(page);
  expect(paused.state).toBe("paused");
  await page.clock.runFor(1400);
  expect(await snapshot(page)).toEqual(paused);
  await page.keyboard.up("d");
  await page.getByRole("button", { name: "חוזרים לזירה" }).click();
  await page.clock.runFor(300);
  expect(Math.abs((await snapshot(page)).fighters[0].vx)).toBeLessThan(1);
  await page.getByRole("button", { name: "איך משחקים" }).click();
  await expect(page.getByRole("dialog", { name: "איך נשארים בזירה?" })).toBeVisible();
  await page.getByRole("button", { name: "סגירת ההוראות" }).click();
  await expect.poll(async () => (await snapshot(page)).state).toBe("playing");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(async () => (await snapshot(page)).state).toBe("paused");
});

test("ring-out result offers rematch, roster change and main menu", async ({ page }) => {
  await page.clock.install();
  await start(page);
  await page.evaluate(async () => {
    const { game } = await import(new URL("src/game.js", location.href).href);
    game.fighters[1].damage = 126;
    game.fighters[1].y = 820;
  });
  await page.clock.runFor(40);
  const finished = await snapshot(page);
  expect(finished.state).toBe("roundOver");
  await expect(page.getByRole("heading", { name: "בנימין נתניהו ניצח!" })).toBeVisible();
  await expect(page.getByRole("button", { name: "בחירת דמויות" })).toBeVisible();
  await expect(page.getByRole("button", { name: "מסך ראשי" })).toBeVisible();
  await page.locator("#play-button").click();
  expect((await snapshot(page)).state).toBe("playing");
});

test("release build works from a subdirectory without missing resources", async ({ page }) => {
  const failures = [];
  page.on("pageerror", error => failures.push(error.message));
  page.on("response", response => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("/dist/");
  await page.getByRole("button", { name: "מול המחשב" }).click();
  await page.locator("#fight-button").click();
  await page.keyboard.down("d");
  await expect.poll(async () => (await snapshot(page)).fighters[0].x).toBeGreaterThan(360);
  await page.keyboard.up("d");
  expect(failures).toEqual([]);
});

test("mobile layout keeps menu, roster and fight controls inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "מול המחשב" })).toBeInViewport();
  await page.getByRole("button", { name: "קרב מקומי" }).click();
  await expect(page.locator(".roster-card").first()).toBeVisible();
  await page.locator("#fight-button").click();
  await expect(page.locator(".controls-ribbon")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("coarse pointer users can opt into held touch controls", async ({ page }) => {
  await page.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = query => query === "(pointer: coarse)"
      ? {
          matches: true,
          media: query,
          onchange: null,
          addEventListener() {},
          removeEventListener() {},
          addListener() {},
          removeListener() {},
          dispatchEvent() { return true; },
        }
      : nativeMatchMedia(query);
  });
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: "איך תרצו לשלוט?" })).toBeVisible();
  await page.getByRole("button", { name: "כפתורי מגע" }).click();
  await page.getByRole("button", { name: "קרב מקומי" }).click();
  await page.locator("#fight-button").click();
  await expect(page.locator("#touch-controls")).toBeVisible();

  const before = await snapshot(page);
  await page.locator('[data-touch-action="right"]').dispatchEvent("pointerdown", { pointerId: 11, pointerType: "touch" });
  await page.clock.runFor(260);
  await page.locator("body").dispatchEvent("pointerup", { pointerId: 11, pointerType: "touch" });
  const moved = await snapshot(page);
  expect(moved.fighters[0].x).toBeGreaterThan(before.fighters[0].x + 25);

  await page.locator('[data-touch-action="jump"]').dispatchEvent("pointerdown", { pointerId: 12, pointerType: "touch" });
  await page.clock.runFor(80);
  await page.locator("body").dispatchEvent("pointerup", { pointerId: 12, pointerType: "touch" });
  expect((await snapshot(page)).fighters[0].y).toBeLessThan(moved.fighters[0].y - 12);

  await page.locator('[data-touch-action="charge"]').dispatchEvent("pointerdown", { pointerId: 13, pointerType: "touch" });
  await page.clock.runFor(1800);
  expect((await snapshot(page)).fighters[0].charge).toBeCloseTo(1.5, 2);
  await page.locator("body").dispatchEvent("pointerup", { pointerId: 13, pointerType: "touch" });
  await page.clock.runFor(30);
  expect((await snapshot(page)).fighters[0].attack).toBe("charge");
});
