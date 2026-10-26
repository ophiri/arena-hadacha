import { ARENA } from "./engine.js";

export class CpuController {
  constructor(slot = 1) {
    this.slot = slot;
    this.reset();
  }

  reset() {
    this.actionCooldown = 0.4;
    this.jumpCooldown = 0;
    this.jumpHold = 0;
    this.chargeReleaseAt = 0;
  }

  update(game, dt) {
    if (game.state !== "playing") return {};
    const fighter = game.fighters[this.slot];
    const target = game.fighters[1 - this.slot];
    if (!fighter || !target) return {};

    this.actionCooldown = Math.max(0, this.actionCooldown - dt);
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
    this.jumpHold = Math.max(0, this.jumpHold - dt);

    const dx = target.x - fighter.x;
    const dy = target.y - fighter.y;
    const distance = Math.abs(dx);
    const main = ARENA.platforms[0];
    const nearLeftEdge = fighter.x < main.x + 58;
    const nearRightEdge = fighter.x + fighter.w > main.x + main.w - 58;
    let direction = distance > 82 ? Math.sign(dx) : 0;
    if (nearLeftEdge) direction = 1;
    if (nearRightEdge) direction = -1;

    let jumpPressed = false;
    const shouldJump = dy < -76 || (nearLeftEdge && dx < 0) || (nearRightEdge && dx > 0);
    if (shouldJump && this.jumpCooldown === 0 && fighter.hitstun === 0) {
      jumpPressed = true;
      this.jumpHold = 0.16;
      this.jumpCooldown = 0.62;
    }

    const charging = fighter.attack?.kind === "charging";
    let chargeHeld = charging && game.elapsed < this.chargeReleaseAt;
    let basicPressed = false;
    if (!fighter.attack && fighter.cooldown === 0 && fighter.hitstun === 0 && this.actionCooldown === 0) {
      if (distance < 125 && Math.abs(dy) < 72) {
        chargeHeld = true;
        this.chargeReleaseAt = game.elapsed + 0.55 + ((Math.floor(game.elapsed * 10) % 5) * 0.12);
        this.actionCooldown = 1.25;
      } else if (distance < 560 && Math.abs(dy) < 115) {
        basicPressed = true;
        this.actionCooldown = 0.72;
      }
    }

    return {
      left: direction < 0,
      right: direction > 0,
      jumpPressed,
      jumpHeld: this.jumpHold > 0,
      basicPressed,
      chargeHeld,
      chargeReleased: charging && !chargeHeld,
    };
  }
}
