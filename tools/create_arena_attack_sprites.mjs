import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(ROOT, "assets", "fighters");
const dataUrl = async (file, mime) =>
  `data:${mime};base64,${(await readFile(path.join(ROOT, file))).toString("base64")}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const sprites = await page.evaluate(async sources => {
  const load = source => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
  const [bibi, benGvir, kahaneHand] = await Promise.all([
    load(sources.bibi),
    load(sources.benGvir),
    load(sources.kahaneHand),
  ]);

  function rounded(ctx, x, y, width, height, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
  }

  function bombPad(ctx, x, y, rotation = 0, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#111426";
    ctx.fillRect(-15, -21, 32, 45);
    rounded(ctx, -18, -24, 32, 44, 3, "#fff1cf");
    ctx.fillStyle = "#303654";
    for (let ring = -16; ring <= 12; ring += 7) ctx.fillRect(ring, -27, 3, 6);
    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.fillStyle = "#a43c35";
    ctx.font = "bold 8px Tahoma, sans-serif";
    ctx.fillText("איראן", -2, -13);
    ctx.strokeStyle = "#20243d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-2, 3, 9, Math.PI, 0);
    ctx.lineTo(7, 12);
    ctx.lineTo(-11, 12);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5, -3);
    ctx.quadraticCurveTo(13, -8, 11, -15);
    ctx.stroke();
    ctx.fillStyle = "#ff754b";
    ctx.beginPath();
    ctx.moveTo(10, -17);
    ctx.lineTo(15, -12);
    ctx.lineTo(9, -10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function handSprite(ctx, x, y, rotation = 0, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.drawImage(kahaneHand, -31, -31, 62, 62);
    ctx.restore();
  }

  function throwStrip(image, fighter) {
    const frameWidth = 176;
    const frameHeight = 150;
    const canvas = document.createElement("canvas");
    canvas.width = frameWidth * 4;
    canvas.height = frameHeight;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const anchorX = 60;
    const bottom = 142;
    const bodyHeight = fighter === "bibi" ? 112 : 110;
    const bodyWidth = fighter === "bibi" ? bodyHeight * 112 / 144 : bodyHeight * 80 / 112;
    const sleeve = fighter === "bibi" ? "#25375e" : "#3b475e";
    const sleeveLight = fighter === "bibi" ? "#526b9a" : "#657a9c";
    const skin = fighter === "bibi" ? "#d6a47f" : "#e2b58d";
    const poses = [
      { length: 24, angle: -1.05, object: true, objectRotation: -0.12 },
      { length: 35, angle: -2.4, object: true, objectRotation: -0.45 },
      { length: 82, angle: -0.06, object: false },
      { length: 45, angle: 0.35, object: false },
    ];

    poses.forEach((pose, frame) => {
      const frameX = frame * frameWidth;
      ctx.drawImage(image, frameX + anchorX - bodyWidth / 2, bottom - bodyHeight + 8, bodyWidth, bodyHeight);
      ctx.save();
      ctx.translate(frameX + anchorX + 12, 73);
      ctx.rotate(pose.angle);
      ctx.strokeStyle = sleeve;
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(pose.length, 0);
      ctx.stroke();
      ctx.strokeStyle = sleeveLight;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(4, -3);
      ctx.lineTo(Math.max(8, pose.length - 6), -3);
      ctx.stroke();
      ctx.translate(pose.length, 0);
      rounded(ctx, -7, -7, 15, 15, 7, skin);
      if (pose.object) {
        if (fighter === "bibi") bombPad(ctx, 12, -2, pose.objectRotation, 0.72);
        else handSprite(ctx, 14, -3, pose.objectRotation, 0.72);
      }
      if (frame === 2) {
        ctx.fillStyle = fighter === "bibi" ? "#ffd24a" : "#73d7ff";
        ctx.globalAlpha = 0.85;
        ctx.fillRect(23, -9, 25, 3);
        ctx.fillRect(31, 3, 17, 3);
      }
      ctx.restore();
    });
    return canvas.toDataURL("image/png");
  }

  const projectileCanvas = document.createElement("canvas");
  projectileCanvas.width = 72 * 4;
  projectileCanvas.height = 72;
  const projectileContext = projectileCanvas.getContext("2d");
  projectileContext.imageSmoothingEnabled = true;
  bombPad(projectileContext, 36, 36, -0.12, 1.05);
  bombPad(projectileContext, 108, 36, 0.12, 1.05);
  handSprite(projectileContext, 180, 36, -0.08, 1);
  handSprite(projectileContext, 252, 36, 0.09, 1);

  return {
    bibi: throwStrip(bibi, "bibi"),
    benGvir: throwStrip(benGvir, "ben-gvir"),
    projectiles: projectileCanvas.toDataURL("image/png"),
  };
}, {
  bibi: await dataUrl("assets/bibi/idle-0.png", "image/png"),
  benGvir: await dataUrl("assets/ben-gvir/portrait.svg", "image/svg+xml"),
  kahaneHand: await dataUrl("assets/fighters/kahane-hand.png", "image/png"),
});

await browser.close();
await mkdir(output, { recursive: true });
for (const [name, url] of Object.entries(sprites)) {
  await writeFile(path.join(output, `${name === "benGvir" ? "ben-gvir" : name}-throw.png`), Buffer.from(url.split(",")[1], "base64"));
}
console.log("Created arena throw strips and projectile sprites in assets/fighters/.");
