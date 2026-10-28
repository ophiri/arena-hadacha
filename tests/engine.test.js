import test from "node:test";
import assert from "node:assert/strict";
import { ARENA, ATTACKS, CHARGE_CAP, Game, PHYSICS, ROSTER, WORLD } from "../src/engine.js";
import { CpuController } from "../src/ai.js";

const STEP = 1 / 120;

function playing() {
  const game = new Game();
  game.startRound();
  return game;
}

function advance(game, seconds, inputs = [{}, {}]) {
  const frames = Math.ceil(seconds / STEP);
  for (let frame = 0; frame < frames; frame++) {
    game.update(STEP, inputs.map((input, index) => ({
      ...input,
      jumpPressed: frame === 0 && input.jumpPressed,
      basicPressed: frame === 0 && input.basicPressed,
      chargeReleased: frame === 0 && input.chargeReleased,
      chargeHeld: typeof input.chargeHeld === "function" ? input.chargeHeld(frame, index) : input.chargeHeld,
    })));
  }
}

function faceOff(game, gap = 22) {
  const [first, second] = game.fighters;
  Object.assign(first, { x: 420, y: 412, vx: 0, vy: 0, grounded: true, facing: 1 });
  Object.assign(second, { x: first.x + first.w + gap, y: 412, vx: 0, vy: 0, grounded: true, facing: -1 });
}

test("the arena contains one main ring and two readable upper platforms", () => {
  assert.equal(ARENA.platforms.filter(platform => platform.kind === "main").length, 1);
  assert.equal(ARENA.platforms.filter(platform => platform.kind === "upper").length, 2);
  assert.ok(ARENA.platforms.every(platform => platform.x > WORLD.blast.left));
});

test("the selectable roster contains five complete original fighters", () => {
  assert.deepEqual(ROSTER.map(character => character.id), ["bibi", "ben-gvir", "gotliv", "bennett", "mansour"]);
  assert.ok(ROSTER.every(character =>
    character.name && character.shortName && character.projectileKind &&
    character.basicLabel && character.chargeLabel && character.portrait));
});

test("the computer controller approaches, jumps and attacks without player-two input", () => {
  const game = new Game(["bibi", "bennett"]);
  const cpu = new CpuController(1);
  game.startRound();
  game.fighters[0].x = 330;
  game.fighters[1].x = 760;
  const startX = game.fighters[1].x;
  for (let frame = 0; frame < 300; frame++) {
    game.update(STEP, [{}, cpu.update(game, STEP)]);
  }
  assert.ok(game.fighters[1].x < startX - 80);
  assert.ok(game.drainEvents().some(event => ["attack", "projectileThrow", "chargeStart"].includes(event.type)));
});

test("character selection supports Tally and mirror matches with unique player slots", () => {
  const game = new Game();
  assert.equal(game.setSelections(["gotliv", "gotliv"]), true);
  assert.deepEqual(game.fighters.map(fighter => fighter.id), ["gotliv", "gotliv"]);
  assert.deepEqual(game.fighters.map(fighter => fighter.slot), [0, 1]);
  game.startRound();
  const [first, second] = game.fighters;
  Object.assign(first, { x: 260, y: 412, facing: 1 });
  Object.assign(second, { x: 790, y: 412, facing: -1 });
  advance(game, 0.14, [{ basicPressed: true }, { basicPressed: true }]);
  assert.deepEqual(game.projectiles.map(projectile => projectile.ownerSlot), [0, 1]);
  assert.ok(game.projectiles.every(projectile => projectile.kind === "objection"));
});

test("ready and paused states freeze movement and time", () => {
  const game = new Game();
  const startX = game.fighters[0].x;
  advance(game, 0.5, [{ right: true }, {}]);
  assert.equal(game.fighters[0].x, startX);
  assert.equal(game.elapsed, 0);
  game.startRound();
  game.pause();
  advance(game, 0.5, [{ right: true }, {}]);
  assert.equal(game.fighters[0].x, startX);
  assert.equal(game.elapsed, 0);
});

test("both fighters move, face their direction and stop with ground friction", () => {
  const game = playing();
  advance(game, 0.35, [{ right: true }, { left: true }]);
  assert.equal(game.fighters[0].facing, 1);
  assert.equal(game.fighters[1].facing, -1);
  assert.ok(game.fighters[0].vx > 300);
  assert.ok(game.fighters[1].vx < -300);
  advance(game, 0.3);
  assert.equal(game.fighters[0].vx, 0);
  assert.equal(game.fighters[1].vx, 0);
});

test("jump input is buffered, supports a short release and lands on the ring", () => {
  const held = playing();
  const tapped = playing();
  advance(held, 0.18, [{ jumpPressed: true, jumpHeld: true }, {}]);
  advance(tapped, 0.18, [{ jumpPressed: true, jumpHeld: false }, {}]);
  assert.ok(held.fighters[0].y < tapped.fighters[0].y - 35);
  advance(held, 1.2);
  assert.equal(held.fighters[0].y + held.fighters[0].h, ARENA.platforms[0].y);
  assert.equal(held.fighters[0].grounded, true);
});

test("each fighter gets exactly one extra jump in the air and refreshes it on landing", () => {
  const game = playing();
  const fighter = game.fighters[0];
  advance(game, 0.14, [{ jumpPressed: true, jumpHeld: true }, {}]);
  const firstJumpVelocity = fighter.vy;
  advance(game, 0.08, [{ jumpPressed: true, jumpHeld: true }, {}]);
  assert.ok(fighter.vy < firstJumpVelocity);
  assert.equal(fighter.airJumps, 0);
  const secondJumpVelocity = fighter.vy;
  advance(game, 0.08, [{ jumpPressed: true, jumpHeld: true }, {}]);
  assert.ok(fighter.vy > secondJumpVelocity);
  advance(game, 1.3);
  assert.equal(fighter.grounded, true);
  assert.equal(fighter.airJumps, 1);
  assert.ok(game.drainEvents().some(event => event.type === "doubleJump"));
});

test("a basic attack deals damage, knockback and cannot hit twice", () => {
  const game = playing();
  faceOff(game);
  advance(game, 0.16, [{ basicPressed: true }, {}]);
  const target = game.fighters[1];
  assert.equal(target.damage, ATTACKS.basic.damage);
  assert.ok(target.vx > ATTACKS.basic.knockback);
  const damage = target.damage;
  advance(game, 0.3);
  assert.equal(target.damage, damage);
  assert.ok(game.drainEvents().some(event => event.type === "hit" && event.damage === ATTACKS.basic.damage));
});

test("basic attacks throw distinct fighter projectiles", () => {
  const game = playing();
  const [first, second] = game.fighters;
  Object.assign(first, { x: 260, y: 412, facing: 1 });
  Object.assign(second, { x: 790, y: 412, facing: -1 });
  advance(game, 0.14, [{ basicPressed: true }, { basicPressed: true }]);
  assert.deepEqual(new Set(game.projectiles.map(projectile => projectile.kind)),
    new Set(["bomb-diagram", "pita"]));

  const mansour = new Game(["mansour", "bennett"]);
  mansour.startRound();
  advance(mansour, 0.14, [{ basicPressed: true }, {}]);
  assert.deepEqual(mansour.projectiles.map(projectile => projectile.kind), ["smoke-ring"]);
  assert.ok(game.drainEvents().filter(event => event.type === "projectileThrow").length === 2);
});

test("held charge visibly caps and release creates a stronger attack", () => {
  const charged = playing();
  faceOff(charged, 30);
  advance(charged, CHARGE_CAP + 0.4, [{ chargeHeld: true }, {}]);
  assert.equal(charged.fighters[0].charge, CHARGE_CAP);
  assert.equal(charged.fighters[0].attack.kind, "charging");
  advance(charged, 0.01, [{ chargeReleased: true, chargeHeld: false }, {}]);
  advance(charged, 0.14);
  const target = charged.fighters[1];
  assert.equal(target.damage, ATTACKS.charge.maxDamage);
  assert.ok(target.vx > ATTACKS.charge.maxKnockback);
  assert.ok(charged.drainEvents().some(event => event.type === "chargeReady"));
});

test("partial charge scales damage between basic and maximum charge", () => {
  const game = playing();
  faceOff(game, 25);
  advance(game, CHARGE_CAP / 2, [{ chargeHeld: true }, {}]);
  advance(game, 0.01, [{ chargeReleased: true }, {}]);
  advance(game, 0.14);
  const damage = game.fighters[1].damage;
  assert.ok(damage > ATTACKS.basic.damage);
  assert.ok(damage < ATTACKS.charge.maxDamage);
});

test("higher accumulated damage increases knockback from the same attack", () => {
  const fresh = playing();
  const damaged = playing();
  faceOff(fresh);
  faceOff(damaged);
  damaged.fighters[1].damage = 100;
  advance(fresh, 0.16, [{ basicPressed: true }, {}]);
  advance(damaged, 0.16, [{ basicPressed: true }, {}]);
  assert.ok(damaged.fighters[1].vx > fresh.fighters[1].vx * 1.8);
  assert.ok(damaged.fighters[1].vy < fresh.fighters[1].vy);
});

test("attack cooldown prevents key-repeat style attack spam", () => {
  const game = playing();
  faceOff(game);
  advance(game, 0.1, [{ basicPressed: true }, {}]);
  const firstAttack = game.fighters[0].attack;
  game.update(STEP, [{ basicPressed: true }, {}]);
  assert.equal(game.fighters[0].attack, firstAttack);
  assert.ok(game.fighters[0].cooldown > 0);
});

test("falling or flying beyond the blast boundary ends the round", () => {
  const game = playing();
  game.fighters[1].y = WORLD.blast.bottom + 1;
  game.update(STEP, [{}, {}]);
  assert.equal(game.state, "roundOver");
  assert.equal(game.winner.id, "bibi");
  assert.equal(game.loser.id, "ben-gvir");
  assert.ok(game.drainEvents().some(event => event.type === "ringOut"));
});

test("a rematch clears damage, motion, attack state and winner", () => {
  const game = new Game(["gotliv", "ben-gvir"]);
  game.startRound();
  game.fighters[0].damage = 88;
  game.fighters[1].x = WORLD.blast.right + 1;
  game.update(STEP, [{}, {}]);
  assert.equal(game.state, "roundOver");
  assert.equal(game.startRound(), true);
  assert.equal(game.state, "playing");
  assert.equal(game.winner, null);
  assert.deepEqual(game.fighters.map(fighter => fighter.damage), [0, 0]);
  assert.deepEqual(game.fighters.map(fighter => fighter.vx), [0, 0]);
  assert.deepEqual(game.fighters.map(fighter => fighter.attack), [null, null]);
  assert.deepEqual(game.fighters.map(fighter => fighter.id), ["gotliv", "ben-gvir"]);
});

test("fighters accelerate less in the air while remaining controllable", () => {
  const game = playing();
  const fighter = game.fighters[0];
  fighter.grounded = false;
  fighter.y = 250;
  advance(game, 0.1, [{ right: true }, {}]);
  assert.ok(fighter.vx > 0);
  assert.ok(fighter.vx < PHYSICS.speed);
});
