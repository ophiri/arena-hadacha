import { ARENA, ATTACKS, CHARGE_CAP, WORLD } from "./engine.js";

const COLORS = {
  ink: "#15172a",
  midnight: "#20243d",
  chamber: "#303654",
  paper: "#fff1cf",
  yellow: "#ffd24a",
  orange: "#ff754b",
  cyan: "#73d7ff",
  pink: "#ef5d78",
};

export class Renderer {
  constructor(canvas, sprites) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (!this.ctx) throw new Error("הדפדפן אינו תומך בציור Canvas דו־ממדי.");
    this.sprites = sprites;
    this.particles = [];
    this.words = [];
    this.shake = 0;
    this.flash = 0;
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.attackSprites = {
      bibi: {
        idle: sprites.bibi,
        basic: sprites.bibiThrow,
        charge: this.createAttackStrip(sprites.bibi, 0, "charge"),
      },
      "ben-gvir": {
        idle: sprites.benGvirIdle,
        run: sprites.benGvirRun,
        basic: sprites.benGvirBasic,
        charge: sprites.benGvirCharge,
      },
      gotliv: {
        idle: sprites.gotliv,
        basic: sprites.gotlivThrow,
        charge: sprites.gotlivCharge,
      },
      bennett: {
        idle: sprites.bennett,
        basic: sprites.bennettBasic,
        charge: sprites.bennettCharge,
      },
    };
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = WORLD.width * this.dpr;
    this.canvas.height = WORLD.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  rect(x, y, w, h, color, radius = 0) {
    const c = this.ctx;
    c.fillStyle = color;
    if (!radius) {
      c.fillRect(x, y, w, h);
      return;
    }
    c.beginPath();
    c.roundRect(x, y, w, h, radius);
    c.fill();
  }

  ellipse(x, y, rx, ry, color) {
    const c = this.ctx;
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
  }

  polygon(points, color) {
    const c = this.ctx;
    c.fillStyle = color;
    c.beginPath();
    points.forEach(([x, y], index) => index ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath();
    c.fill();
  }

  createAttackStrip(image, fighterIndex, kind) {
    const frameWidth = 176;
    const frameHeight = 150;
    const strip = document.createElement("canvas");
    strip.width = frameWidth * 3;
    strip.height = frameHeight;
    const c = strip.getContext("2d");
    c.imageSmoothingEnabled = false;
    const anchorX = 60;
    const bottom = 142;
    const bodyHeight = fighterIndex === 0 ? 112 : 110;
    const bodyWidth = fighterIndex === 0 ? bodyHeight * 112 / 144 : bodyHeight * 80 / 112;
    const sleeve = fighterIndex === 0 ? "#25375e" : "#3b475e";
    const sleeveLight = fighterIndex === 0 ? "#405787" : "#5a6d8c";
    const glove = fighterIndex === 0 ? COLORS.orange : COLORS.cyan;
    const gloveDark = fighterIndex === 0 ? "#a9462b" : "#287597";
    const charged = kind === "charge";
    const poses = charged
      ? [{ length: 32, angle: -0.86 }, { length: 97, angle: -0.05 }, { length: 54, angle: 0.28 }]
      : [{ length: 25, angle: -0.72 }, { length: 70, angle: -0.04 }, { length: 41, angle: 0.24 }];

    poses.forEach((pose, frame) => {
      const frameX = frame * frameWidth;
      c.drawImage(image, frameX + anchorX - bodyWidth / 2, bottom - bodyHeight + 8, bodyWidth, bodyHeight);
      c.save();
      c.translate(frameX + anchorX + 13, 73);
      c.rotate(pose.angle);
      c.strokeStyle = sleeve;
      c.lineWidth = charged ? 16 : 13;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(pose.length, 0);
      c.stroke();
      c.strokeStyle = sleeveLight;
      c.lineWidth = charged ? 5 : 4;
      c.beginPath();
      c.moveTo(4, -3);
      c.lineTo(Math.max(7, pose.length - 7), -3);
      c.stroke();
      c.translate(pose.length, 0);
      c.rotate(-pose.angle * 0.22);
      c.fillStyle = gloveDark;
      c.beginPath();
      c.roundRect(-7, charged ? -16 : -13, charged ? 32 : 26, charged ? 31 : 26, 9);
      c.fill();
      c.fillStyle = glove;
      c.beginPath();
      c.roundRect(-4, charged ? -16 : -13, charged ? 29 : 23, charged ? 25 : 21, 8);
      c.fill();
      c.fillStyle = "#fff1cf";
      c.fillRect(-8, -8, 8, 16);
      if (frame === 1) {
        c.fillStyle = charged ? COLORS.yellow : "#fff1cf";
        c.globalAlpha = charged ? 0.95 : 0.72;
        for (let ray = 0; ray < (charged ? 6 : 4); ray++) {
          c.save();
          c.rotate(ray * Math.PI * 2 / (charged ? 6 : 4));
          c.fillRect(charged ? 31 : 25, -2, charged ? 18 : 10, 4);
          c.restore();
        }
      }
      c.restore();
    });
    return strip;
  }

  handleEvent(event) {
    if (event.type === "hit") {
      this.shake = this.reducedMotion ? 0 : 8 + event.power * 8;
      this.flash = 0.08;
      this.burst(event.x, event.y, event.power > 0.6 ? COLORS.orange : COLORS.yellow, 16 + Math.round(event.power * 16));
      this.words.push({
        x: event.x,
        y: event.y - 28,
        text: event.power > 0.78 ? "בום!" : event.damage >= 12 ? "פגיעה!" : "טאק!",
        life: 0.75,
      });
    } else if (event.type === "doubleJump") {
      const color = this.lastGame?.fighters[event.slot]?.color || COLORS.cyan;
      this.burst(event.x, event.y, color, 12, true);
    } else if (event.type === "land") {
      this.burst(event.x, event.y, "#fff1cf", 5, true);
    } else if (event.type === "chargeReady") {
      const source = this.lastGame?.fighters[event.slot];
      if (source) this.words.push({ x: source.x + source.w / 2, y: source.y - 22, text: "מקסימום!", life: 0.8 });
    } else if (event.type === "ringOut") {
      this.shake = this.reducedMotion ? 0 : 17;
      this.flash = 0.18;
      this.burst(
        Math.max(20, Math.min(WORLD.width - 20, event.x)),
        Math.max(30, Math.min(WORLD.height - 30, event.y)),
        COLORS.orange,
        42,
      );
    }
  }

  burst(x, y, color, count, dust = false) {
    if (this.reducedMotion) return;
    for (let index = 0; index < count; index++) {
      const angle = Math.PI * 2 * index / count + Math.random() * 0.25;
      const speed = dust ? 35 + Math.random() * 55 : 95 + Math.random() * 210;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (dust ? 25 : 55),
        size: dust ? 3 : 3 + Math.random() * 6,
        life: dust ? 0.35 : 0.65 + Math.random() * 0.25,
        color,
      });
    }
  }

  background(time) {
    const c = this.ctx;
    const sky = c.createLinearGradient(0, 0, 0, WORLD.height);
    sky.addColorStop(0, "#17192d");
    sky.addColorStop(0.52, "#292e4a");
    sky.addColorStop(1, "#101323");
    this.rect(0, 0, WORLD.width, WORLD.height, sky);

    c.globalAlpha = 0.3;
    this.polygon([[80, 0], [290, 0], [495, 500], [395, 500]], "#ffe9ad");
    this.polygon([[840, 0], [1040, 0], [725, 500], [625, 500]], "#89deff");
    c.globalAlpha = 1;

    for (let row = 0; row < 4; row++) {
      const y = 262 + row * 53;
      const inset = row * 38;
      this.ctx.strokeStyle = row % 2 ? "#51597a" : "#454d6d";
      this.ctx.lineWidth = 24;
      this.ctx.beginPath();
      this.ctx.ellipse(WORLD.width / 2, y, 430 - inset, 126 - row * 13, 0, Math.PI, Math.PI * 2);
      this.ctx.stroke();
      for (let index = 0; index < 13 - row; index++) {
        const angle = Math.PI + (index + 0.5) / (13 - row) * Math.PI;
        const rx = 430 - inset;
        const ry = 126 - row * 13;
        const x = WORLD.width / 2 + Math.cos(angle) * rx;
        const dotY = y + Math.sin(angle) * ry;
        this.ellipse(x, dotY, 4, 4, index % 3 === 0 ? "#ffd24a88" : "#f4efd34a");
      }
    }

    this.rect(438, 168, 244, 74, "#111426", 8);
    this.rect(446, 176, 228, 58, "#282e49", 4);
    c.direction = "rtl";
    c.textAlign = "center";
    c.fillStyle = COLORS.paper;
    c.font = "900 25px Arial, sans-serif";
    c.fillText("ברואליציה", WORLD.width / 2, 205);
    c.fillStyle = "#aeb6d6";
    c.font = "bold 11px Arial, sans-serif";
    c.fillText("סיבוב אחד · בלי חסינות", WORLD.width / 2, 224);

    for (let index = 0; index < 26; index++) {
      const x = 18 + index * 44;
      const pulse = this.reducedMotion ? 0.72 : 0.55 + Math.sin(time * 2.3 + index) * 0.16;
      this.ellipse(x, 88, 4, 4, index % 2 ? `rgba(255,210,74,${pulse})` : `rgba(115,215,255,${pulse})`);
    }
  }

  platform(platform) {
    if (platform.kind === "main") {
      this.rect(platform.x + 10, platform.y + 14, platform.w - 20, 73, "#080a15aa", 8);
      this.rect(platform.x, platform.y, platform.w, 55, "#ece0bd", 6);
      this.rect(platform.x, platform.y, platform.w, 11, COLORS.yellow, 5);
      this.rect(platform.x + 20, platform.y + 22, platform.w - 40, 20, "#252a43", 4);
      for (let x = platform.x + 25; x < platform.x + platform.w - 20; x += 42) {
        this.polygon([[x, platform.y + 22], [x + 18, platform.y + 22], [x + 2, platform.y + 42], [x - 16, platform.y + 42]], "#ff754b");
      }
      this.rect(platform.x + platform.w / 2 - 72, platform.y - 7, 144, 18, "#fff1cf", 4);
      this.ctx.fillStyle = "#24283f";
      this.ctx.font = "900 10px Arial, sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.direction = "rtl";
      this.ctx.fillText("אין מעקה. יש כותרות.", platform.x + platform.w / 2, platform.y + 5);
    } else {
      this.rect(platform.x + 6, platform.y + 8, platform.w - 12, 27, "#080a15a0", 4);
      this.rect(platform.x, platform.y, platform.w, platform.h, "#7d86a8", 4);
      this.rect(platform.x, platform.y, platform.w, 6, "#d7dcf1", 3);
      for (let x = platform.x + 16; x < platform.x + platform.w - 12; x += 30) {
        this.rect(x, platform.y + 10, 14, 3, "#4a526f");
      }
    }
  }

  fighter(fighter, index, time) {
    const c = this.ctx;
    const centerX = fighter.x + fighter.w / 2;
    const bottom = fighter.y + fighter.h;
    const charging = fighter.attack?.kind === "charging";
    const chargeRatio = fighter.charge / CHARGE_CAP;
    const attack = fighter.attack && fighter.attack.kind !== "charging" ? fighter.attack : null;
    const bob = fighter.grounded && !fighter.attack && !this.reducedMotion ? Math.sin(time * 4 + index) * 1.5 : 0;

    this.ellipse(centerX, bottom + 4, 34, 7, "#05071170");
    if (charging) {
      const radius = 42 + chargeRatio * 23 + (this.reducedMotion ? 0 : Math.sin(time * 14) * 3);
      c.strokeStyle = `${fighter.color}cc`;
      c.lineWidth = 4 + chargeRatio * 3;
      c.beginPath();
      c.arc(centerX, fighter.y + fighter.h / 2, radius, 0, Math.PI * 2);
      c.stroke();
      for (let spark = 0; spark < 7; spark++) {
        const angle = time * (index ? -2.6 : 2.6) + spark * Math.PI * 2 / 7;
        this.ellipse(
          centerX + Math.cos(angle) * radius,
          fighter.y + fighter.h / 2 + Math.sin(angle) * radius,
          3 + chargeRatio * 2,
          3 + chargeRatio * 2,
          fighter.accent,
        );
      }
    }

    c.save();
    c.translate(centerX, bottom + bob);
    c.scale(fighter.facing, 1);
    if (fighter.hitstun > 0) c.rotate(-fighter.facing * 0.16);
    if (fighter.flash > 0 && !this.reducedMotion && Math.floor(fighter.flash * 80) % 2) c.globalAlpha = 0.45;
    const spriteSet = this.attackSprites[fighter.id];
    if (attack) {
      const rules = ATTACKS[attack.kind];
      const hasFourFrameCharge = ["ben-gvir", "gotliv", "bennett"].includes(fighter.id) && attack.kind === "charge";
      const frame = attack.kind === "basic"
        ? attack.time < rules.activeStart * 0.48 ? 0
          : attack.time < rules.activeStart ? 1
            : attack.time <= rules.activeEnd + 0.045 ? 2 : 3
        : hasFourFrameCharge
          ? attack.time < rules.activeStart * 0.34 ? 0
            : attack.time < rules.activeStart * 0.67 ? 1
              : attack.time < rules.activeStart ? 2
                : attack.time <= rules.activeEnd ? 3 : 0
          : attack.time < rules.activeStart ? 0 : attack.time <= rules.activeEnd ? 1 : 2;
      const frameCount = attack.kind === "basic" || hasFourFrameCharge ? 4 : 3;
      c.translate(attack.kind === "charge" ? 8 : 4, 0);
      c.drawImage(
        spriteSet[attack.kind],
        Math.min(frame, frameCount - 1) * 176, 0, 176, 150,
        -60, -142, 176, 150,
      );
    } else if (charging && ["ben-gvir", "gotliv", "bennett"].includes(fighter.id)) {
      const frame = chargeRatio < 0.34 ? 0 : chargeRatio < 0.76 ? 1 : 2;
      c.drawImage(spriteSet.charge, frame * 176, 0, 176, 150, -60, -142, 176, 150);
    } else if (fighter.id === "ben-gvir") {
      const running = fighter.grounded && Math.abs(fighter.vx) > 40;
      const frameCount = running ? 6 : 4;
      const frame = Math.floor(time * (running ? 10 : 4)) % frameCount;
      c.drawImage(
        running ? spriteSet.run : spriteSet.idle,
        frame * 176, 0, 176, 150,
        -60, -142, 176, 150,
      );
    } else {
      const dimensions = { width: 87, height: 112 };
      c.drawImage(spriteSet.idle, -dimensions.width / 2, -dimensions.height + 8, dimensions.width, dimensions.height);
    }
    c.restore();

    this.rect(centerX - 50, fighter.y - 34, 100, 20, "#111426e8", 5);
    c.fillStyle = fighter.color;
    c.font = "900 11px Arial, sans-serif";
    c.textAlign = "center";
    c.direction = "rtl";
    c.fillText(fighter.shortName, centerX, fighter.y - 20);

    if (charging) {
      this.rect(centerX - 40, fighter.y - 9, 80, 7, "#101326", 4);
      this.rect(centerX - 38, fighter.y - 7, 76 * chargeRatio, 3, fighter.color, 2);
    }
  }

  projectile(projectile) {
    const c = this.ctx;
    if (["objection", "speech-bubble", "pita"].includes(projectile.kind)) {
      const frame = Math.floor(projectile.age * 10) % 2;
      const sheet = projectile.kind === "objection"
        ? this.sprites.gotlivProjectile
        : projectile.kind === "pita"
          ? this.sprites.benGvirProjectile
          : this.sprites.bennettProjectile;
      c.save();
      c.translate(projectile.x + projectile.w / 2, projectile.y + projectile.h / 2);
      c.rotate(projectile.angle);
      if (projectile.direction < 0) c.scale(-1, 1);
      c.drawImage(sheet, frame * 72, 0, 72, 72, -31, -31, 62, 62);
      c.restore();
      return;
    }
    const pairOffset = projectile.kind === "bomb-pad" ? 0 : 2;
    const frame = pairOffset + Math.floor(projectile.age * 10) % 2;
    c.save();
    c.translate(projectile.x + projectile.w / 2, projectile.y + projectile.h / 2);
    c.rotate(projectile.angle);
    if (projectile.direction < 0) c.scale(-1, 1);
    c.drawImage(this.sprites.projectiles, frame * 72, 0, 72, 72, -31, -31, 62, 62);
    c.restore();
  }

  effects(dt) {
    const c = this.ctx;
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 390 * dt;
      c.globalAlpha = Math.max(0, particle.life / 0.85);
      this.rect(particle.x, particle.y, particle.size, particle.size, particle.color, 1);
    }
    this.particles = this.particles.filter(particle => particle.life > 0);
    c.globalAlpha = 1;

    for (const word of this.words) {
      word.life -= dt;
      const rise = this.reducedMotion ? 0 : (0.75 - word.life) * 34;
      c.globalAlpha = Math.min(1, word.life * 3);
      this.rect(word.x - 42, word.y - rise - 23, 84, 29, COLORS.paper, 8);
      c.strokeStyle = COLORS.ink;
      c.lineWidth = 2;
      c.strokeRect(word.x - 39, word.y - rise - 20, 78, 23);
      c.fillStyle = COLORS.ink;
      c.font = "900 15px Arial, sans-serif";
      c.textAlign = "center";
      c.direction = "rtl";
      c.fillText(word.text, word.x, word.y - rise - 4);
    }
    this.words = this.words.filter(word => word.life > 0);
    c.globalAlpha = 1;
  }

  draw(game, time, dt) {
    this.lastGame = game;
    const c = this.ctx;
    const shakeX = this.shake && !this.reducedMotion ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake && !this.reducedMotion ? (Math.random() - 0.5) * this.shake : 0;
    this.shake = Math.max(0, this.shake - dt * 45);
    c.save();
    c.translate(shakeX, shakeY);
    this.background(time);
    ARENA.platforms.forEach(platform => this.platform(platform));
    game.projectiles.forEach(projectile => this.projectile(projectile));
    game.fighters.forEach((fighter, index) => this.fighter(fighter, index, time));
    this.effects(game.state === "paused" ? 0 : dt);
    c.restore();
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt);
      c.globalAlpha = this.flash * 2.8;
      this.rect(0, 0, WORLD.width, WORLD.height, "#fff8db");
      c.globalAlpha = 1;
    }
  }
}
