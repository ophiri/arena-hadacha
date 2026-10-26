export const WORLD = {
  width: 1120,
  height: 620,
  blast: { left: -180, right: 1300, top: -190, bottom: 790 },
};

export const PHYSICS = {
  speed: 330,
  acceleration: 2350,
  airAcceleration: 1420,
  friction: 2550,
  gravity: 1880,
  jump: 760,
  maxFall: 1050,
};

export const CHARGE_CAP = 1.5;

export const ROSTER = [
  {
    id: "bibi",
    name: "בנימין נתניהו",
    shortName: "נתניהו",
    color: "#ffd24a",
    accent: "#ff754b",
    projectileKind: "bomb-pad",
    basicLabel: "זורק לוח איראן",
    chargeLabel: "מכת טעינה",
    portrait: "assets/bibi/idle-0.png",
  },
  {
    id: "ben-gvir",
    name: "איתמר בן גביר",
    shortName: "בן גביר",
    color: "#73d7ff",
    accent: "#ef5d78",
    projectileKind: "pita",
    basicLabel: "מתקפת פיתה",
    chargeLabel: "בעיטת תנין",
    portrait: "assets/fighters/ben-gvir-portrait.png",
  },
  {
    id: "gotliv",
    name: "טלי גוטליב",
    shortName: "גוטליב",
    color: "#ef8bd7",
    accent: "#ffd24a",
    projectileKind: "objection",
    basicLabel: "זורקת התנגדות!",
    chargeLabel: "פטיש סדר",
    portrait: "assets/fighters/gotliv-idle.png",
  },
  {
    id: "bennett",
    name: "נפתלי בנט",
    shortName: "בנט",
    color: "#8ee7a8",
    accent: "#4ea4ff",
    projectileKind: "speech-bubble",
    basicLabel: "קורא: אחים שלי!",
    chargeLabel: "בעיטת הייטק",
    portrait: "assets/fighters/bennett-idle.png",
  },
];

const ROSTER_BY_ID = new Map(ROSTER.map(character => [character.id, character]));

export const ATTACKS = {
  basic: {
    duration: 0.42,
    activeStart: 0.13,
    activeEnd: 0.16,
    cooldown: 0.25,
    damage: 9,
    knockback: 235,
    vertical: 135,
    projectileSpeed: 530,
  },
  charge: {
    duration: 0.48,
    activeStart: 0.09,
    activeEnd: 0.25,
    cooldown: 0.31,
    minDamage: 12,
    maxDamage: 28,
    minKnockback: 345,
    maxKnockback: 650,
    minVertical: 190,
    maxVertical: 325,
    minReach: 62,
    maxReach: 94,
    height: 54,
  },
};

export const ARENA = {
  platforms: [
    { x: 150, y: 500, w: 820, h: 42, kind: "main" },
    { x: 298, y: 358, w: 184, h: 20, kind: "upper" },
    { x: 638, y: 358, w: 184, h: 20, kind: "upper" },
  ],
  spawns: [
    { x: 336, y: 412 },
    { x: 728, y: 412 },
  ],
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const approach = (value, target, amount) =>
  value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);
const lerp = (start, end, amount) => start + (end - start) * amount;

export const overlaps = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class Game {
  constructor(selections = ["bibi", "ben-gvir"]) {
    this.events = [];
    this.round = 0;
    this.selections = this.validateSelections(selections);
    this.reset("ready");
  }

  validateSelections(selections) {
    return [0, 1].map(slot => {
      const id = selections?.[slot];
      return ROSTER_BY_ID.has(id) ? id : ROSTER[slot].id;
    });
  }

  setSelections(selections) {
    if (this.state !== "ready") return false;
    this.selections = this.validateSelections(selections);
    this.reset("ready");
    return true;
  }

  cycleSelection(slot, direction) {
    if (this.state !== "ready" || ![0, 1].includes(slot)) return false;
    const current = ROSTER.findIndex(character => character.id === this.selections[slot]);
    const next = (current + direction + ROSTER.length) % ROSTER.length;
    const selections = [...this.selections];
    selections[slot] = ROSTER[next].id;
    return this.setSelections(selections);
  }

  reset(state = "playing") {
    this.state = state;
    this.round += state === "playing" ? 1 : 0;
    this.elapsed = 0;
    this.winner = null;
    this.loser = null;
    this.projectiles = [];
    this.events.length = 0;
    this.fighters = this.selections.map((id, slot) => this.createFighter({
      ...ROSTER_BY_ID.get(id),
      slot,
      spawn: ARENA.spawns[slot],
      facing: slot === 0 ? 1 : -1,
    }));
  }

  createFighter(config) {
    return {
      ...config,
      x: config.spawn.x,
      y: config.spawn.y,
      w: 56,
      h: 88,
      vx: 0,
      vy: 0,
      grounded: true,
      coyote: 0.1,
      jumpBuffer: 0,
      airJumps: 1,
      damage: 0,
      cooldown: 0,
      hitstun: 0,
      flash: 0,
      attack: null,
      charge: 0,
      chargeReadyAnnounced: false,
      landing: 0,
    };
  }

  startRound() {
    if (!["ready", "roundOver"].includes(this.state)) return false;
    this.reset("playing");
    this.emit("roundStart", { round: this.round });
    return true;
  }

  pause() {
    if (this.state === "playing") this.state = "paused";
    else if (this.state === "paused") this.state = "playing";
  }

  cancelCharging() {
    for (const fighter of this.fighters) {
      if (fighter.attack?.kind === "charging") fighter.attack = null;
      fighter.charge = 0;
      fighter.chargeReadyAnnounced = false;
    }
  }

  emit(type, extra = {}) {
    this.events.push({ type, ...extra });
  }

  drainEvents() {
    return this.events.splice(0);
  }

  startAttack(fighter, kind, power = 0) {
    const rules = ATTACKS[kind];
    fighter.attack = { kind, time: 0, power, connected: false, projectileFired: false };
    fighter.cooldown = rules.duration + rules.cooldown;
    fighter.charge = 0;
    fighter.chargeReadyAnnounced = false;
    this.emit("attack", { fighter: fighter.id, slot: fighter.slot, kind, power });
  }

  attackBox(fighter) {
    if (!fighter.attack || fighter.attack.kind === "charging") return null;
    const { kind, power, time } = fighter.attack;
    if (kind === "basic") return null;
    const rules = ATTACKS[kind];
    if (time < rules.activeStart || time > rules.activeEnd) return null;
    const reach = kind === "basic" ? rules.reach : lerp(rules.minReach, rules.maxReach, power);
    return {
      x: fighter.facing > 0 ? fighter.x + fighter.w - 5 : fighter.x - reach + 5,
      y: fighter.y + 18,
      w: reach,
      h: rules.height,
    };
  }

  resolveHit(attacker, target) {
    const attack = attacker.attack;
    if (!attack || attack.connected) return;
    const rules = ATTACKS[attack.kind];
    const power = attack.kind === "basic" ? 0 : attack.power;
    const damage = attack.kind === "basic" ? rules.damage : lerp(rules.minDamage, rules.maxDamage, power);
    const baseKnockback = attack.kind === "basic" ? rules.knockback : lerp(rules.minKnockback, rules.maxKnockback, power);
    const vertical = attack.kind === "basic" ? rules.vertical : lerp(rules.minVertical, rules.maxVertical, power);
    target.damage = Math.min(999, target.damage + Math.round(damage));
    const damageScale = 1 + target.damage / 92;
    target.vx = attacker.facing * baseKnockback * damageScale;
    target.vy = -vertical * (0.92 + target.damage / 260);
    target.grounded = false;
    target.coyote = 0;
    target.hitstun = 0.15 + power * 0.2 + target.damage / 620;
    target.flash = 0.16;
    target.attack = null;
    target.charge = 0;
    attack.connected = true;
    attacker.vx -= attacker.facing * (attack.kind === "charge" ? 48 : 24);
    this.emit("hit", {
      attacker: attacker.id,
      attackerSlot: attacker.slot,
      target: target.id,
      targetSlot: target.slot,
      x: target.x + target.w / 2,
      y: target.y + target.h / 2,
      damage: Math.round(damage),
      power,
      knockback: Math.round(baseKnockback * damageScale),
    });
  }

  spawnProjectile(fighter) {
    const direction = fighter.facing;
    const kind = fighter.projectileKind;
    this.projectiles.push({
      ownerSlot: fighter.slot,
      kind,
      x: direction > 0 ? fighter.x + fighter.w - 4 : fighter.x - 42,
      y: fighter.y + 18,
      w: 46,
      h: 46,
      vx: direction * ATTACKS.basic.projectileSpeed,
      vy: kind === "bomb-pad" ? -34 : ["objection", "speech-bubble", "pita"].includes(kind) ? -48 : -14,
      direction,
      age: 0,
      life: 1.65,
      angle: 0,
      spin: kind === "bomb-pad" ? direction * 1.35
        : ["objection", "speech-bubble"].includes(kind) ? direction * 0.45
          : kind === "pita" ? direction * 3.4
          : direction * 2.2,
    });
    this.emit("projectileThrow", {
      fighter: fighter.id,
      slot: fighter.slot,
      projectile: kind,
      x: fighter.x + fighter.w / 2,
      y: fighter.y + 34,
    });
  }

  resolveProjectileHit(projectile, target) {
    const rules = ATTACKS.basic;
    target.damage = Math.min(999, target.damage + rules.damage);
    const damageScale = 1 + target.damage / 92;
    target.vx = projectile.direction * rules.knockback * damageScale;
    target.vy = -rules.vertical * (0.92 + target.damage / 260);
    target.grounded = false;
    target.coyote = 0;
    target.hitstun = 0.15 + target.damage / 680;
    target.flash = 0.16;
    target.attack = null;
    target.charge = 0;
    projectile.life = 0;
    this.emit("hit", {
      attacker: this.fighters[projectile.ownerSlot]?.id,
      attackerSlot: projectile.ownerSlot,
      target: target.id,
      targetSlot: target.slot,
      x: target.x + target.w / 2,
      y: target.y + target.h / 2,
      damage: rules.damage,
      power: 0,
      knockback: Math.round(rules.knockback * damageScale),
      projectile: projectile.kind,
    });
  }

  updateProjectiles(dt) {
    for (const projectile of this.projectiles) {
      projectile.age += dt;
      projectile.life -= dt;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.angle += projectile.spin * dt;
      if (projectile.kind === "bomb-pad") projectile.vy += 42 * dt;
      const target = this.fighters.find(fighter => fighter.slot !== projectile.ownerSlot);
      if (projectile.life > 0 && target && target.flash <= 0 && overlaps(projectile, target)) {
        this.resolveProjectileHit(projectile, target);
      }
    }
    this.projectiles = this.projectiles.filter(projectile =>
      projectile.life > 0 &&
      projectile.x + projectile.w > WORLD.blast.left &&
      projectile.x < WORLD.blast.right &&
      projectile.y + projectile.h > WORLD.blast.top &&
      projectile.y < WORLD.blast.bottom);
  }

  updateFighter(fighter, input, dt) {
    fighter.cooldown = Math.max(0, fighter.cooldown - dt);
    fighter.hitstun = Math.max(0, fighter.hitstun - dt);
    fighter.flash = Math.max(0, fighter.flash - dt);
    fighter.landing = Math.max(0, fighter.landing - dt);
    fighter.jumpBuffer = input.jumpPressed ? 0.12 : Math.max(0, fighter.jumpBuffer - dt);
    fighter.coyote = fighter.grounded ? 0.1 : Math.max(0, fighter.coyote - dt);

    const charging = fighter.attack?.kind === "charging";
    if (charging) {
      fighter.charge = Math.min(CHARGE_CAP, fighter.charge + dt);
      if (fighter.charge === CHARGE_CAP && !fighter.chargeReadyAnnounced) {
        fighter.chargeReadyAnnounced = true;
        this.emit("chargeReady", { fighter: fighter.id, slot: fighter.slot });
      }
      if (input.chargeReleased || !input.chargeHeld) {
        this.startAttack(fighter, "charge", fighter.charge / CHARGE_CAP);
      }
    } else if (fighter.attack) {
      fighter.attack.time += dt;
      const rules = ATTACKS[fighter.attack.kind];
      if (fighter.attack.kind === "basic" &&
        !fighter.attack.projectileFired &&
        fighter.attack.time >= rules.activeStart) {
        fighter.attack.projectileFired = true;
        this.spawnProjectile(fighter);
      }
      if (fighter.attack.time >= rules.duration) fighter.attack = null;
    } else if (fighter.hitstun <= 0) {
      if (input.basicPressed && fighter.cooldown === 0) {
        this.startAttack(fighter, "basic");
      } else if (input.chargeHeld && fighter.cooldown === 0) {
        fighter.attack = { kind: "charging", time: 0, power: 0, connected: false };
        fighter.charge = 0;
        fighter.chargeReadyAnnounced = false;
        this.emit("chargeStart", { fighter: fighter.id, slot: fighter.slot });
      }
    }

    const locked = fighter.hitstun > 0 || (fighter.attack && fighter.attack.kind !== "charging");
    const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
    if (!locked && direction) {
      const chargeFactor = fighter.attack?.kind === "charging" ? 0.32 : 1;
      const acceleration = fighter.grounded ? PHYSICS.acceleration : PHYSICS.airAcceleration;
      fighter.vx = approach(fighter.vx, direction * PHYSICS.speed * chargeFactor, acceleration * dt);
      fighter.facing = direction;
    } else if (fighter.grounded && fighter.hitstun <= 0) {
      fighter.vx = approach(fighter.vx, 0, PHYSICS.friction * dt);
    }

    const canGroundJump = fighter.coyote > 0;
    const canAirJump = !fighter.grounded && fighter.airJumps > 0;
    if (!locked && !charging && fighter.jumpBuffer > 0 && (canGroundJump || canAirJump)) {
      const doubleJump = !canGroundJump;
      fighter.vy = -PHYSICS.jump * (doubleJump ? 0.92 : 1);
      fighter.grounded = false;
      fighter.coyote = 0;
      fighter.jumpBuffer = 0;
      if (doubleJump) fighter.airJumps--;
      this.emit(doubleJump ? "doubleJump" : "jump", {
        fighter: fighter.id,
        slot: fighter.slot,
        x: fighter.x + fighter.w / 2,
        y: fighter.y + fighter.h,
      });
    }
    if (!input.jumpHeld && fighter.vy < -320) fighter.vy = -320;

    fighter.vy = Math.min(PHYSICS.maxFall, fighter.vy + PHYSICS.gravity * dt);
    fighter.x += fighter.vx * dt;
    const previousBottom = fighter.y + fighter.h;
    fighter.y += fighter.vy * dt;
    fighter.grounded = false;

    for (const platform of ARENA.platforms) {
      const horizontal = fighter.x + fighter.w > platform.x && fighter.x < platform.x + platform.w;
      const crossedTop = previousBottom <= platform.y && fighter.y + fighter.h >= platform.y;
      if (horizontal && crossedTop && fighter.vy >= 0) {
        fighter.y = platform.y - fighter.h;
        fighter.vy = 0;
        fighter.grounded = true;
        fighter.airJumps = 1;
        if (previousBottom < platform.y - 5) {
          fighter.landing = 0.1;
          this.emit("land", { fighter: fighter.id, slot: fighter.slot, x: fighter.x + fighter.w / 2, y: platform.y });
        }
        break;
      }
    }
  }

  resolveFighterOverlap() {
    const [a, b] = this.fighters;
    if (!overlaps(a, b)) return;
    const overlapX = Math.min(a.x + a.w - b.x, b.x + b.w - a.x);
    if (overlapX <= 0 || Math.abs(a.y + a.h / 2 - (b.y + b.h / 2)) > 58) return;
    const push = overlapX / 2 + 0.1;
    if (a.x < b.x) {
      a.x -= push;
      b.x += push;
    } else {
      a.x += push;
      b.x -= push;
    }
  }

  isRingedOut(fighter) {
    return fighter.x + fighter.w < WORLD.blast.left ||
      fighter.x > WORLD.blast.right ||
      fighter.y + fighter.h < WORLD.blast.top ||
      fighter.y > WORLD.blast.bottom;
  }

  update(dt, inputs = [{}, {}]) {
    dt = clamp(dt, 0, 1 / 60);
    if (this.state !== "playing") return;
    this.elapsed += dt;
    this.fighters.forEach((fighter, index) => this.updateFighter(fighter, inputs[index] || {}, dt));
    this.resolveFighterOverlap();
    this.updateProjectiles(dt);

    for (let index = 0; index < this.fighters.length; index++) {
      const attacker = this.fighters[index];
      const target = this.fighters[1 - index];
      const hitbox = this.attackBox(attacker);
      if (hitbox && !attacker.attack.connected && target.flash <= 0 && overlaps(hitbox, target)) {
        this.resolveHit(attacker, target);
      }
    }

    const defeated = this.fighters.find(fighter => this.isRingedOut(fighter));
    if (defeated) {
      this.loser = defeated;
      this.winner = this.fighters.find(fighter => fighter !== defeated);
      this.state = "roundOver";
      this.emit("ringOut", {
        winner: this.winner.id,
        winnerSlot: this.winner.slot,
        loser: this.loser.id,
        loserSlot: this.loser.slot,
        x: defeated.x + defeated.w / 2,
        y: defeated.y + defeated.h / 2,
      });
    }
  }
}
