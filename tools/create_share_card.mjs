import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const portrait = await readFile(new URL("../assets/bibi/victory-0.png", import.meta.url));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8">
    <style>
      *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#202238;color:#faf1d8;font-family:Arial,sans-serif}
      .dots{position:absolute;inset:0;background-image:radial-gradient(#faf1d825 1px,transparent 1px);background-size:7px 7px}
      .rays{position:absolute;width:540px;height:540px;left:15px;bottom:-30px;border-radius:50%;background:repeating-conic-gradient(from 12deg,#ffcf492b 0deg 13deg,transparent 13deg 28deg)}
      img{position:absolute;height:545px;left:80px;bottom:-8px;image-rendering:pixelated;filter:drop-shadow(5px 7px 0 #080a22) drop-shadow(-2px -2px 0 #ffebbc)}
      main{position:absolute;right:80px;top:60px;width:530px}
      .label{font-size:19px;color:#e1c68f;margin:0 0 27px}.small{font-size:56px;font-weight:900}
      h1{font-size:160px;line-height:1;margin:0 0 27px;color:#ffd24a;text-shadow:6px 7px #090c1e;white-space:nowrap}
      em{display:inline-block;font-style:normal;color:#ff754b;-webkit-text-stroke:2px #ffdab4;transform:rotate(-9deg)}
      h2{font-size:37px;margin:0 0 19px}p{font-size:23px;line-height:1.7;margin:0;color:#c5c6d6}
      .sticker{position:absolute;bottom:37px;left:75px;background:#ff754b;color:#17192b;border:4px solid #17192b;box-shadow:-5px 6px #090c1e;padding:13px 23px;transform:rotate(6deg);font-size:23px;font-weight:bold}
      footer{position:absolute;right:80px;bottom:34px;font-size:16px;color:#b5b0c8}
    </style>
    <div class="dots"></div><div class="rays"></div>
    <img alt="" src="data:image/png;base64,${portrait.toString("base64")}">
    <main><p class="label">משחק פארודיה עצמאי · בחינם ובדפדפן</p><span class="small">סופר</span><h1>ביבי <em>3</em></h1>
    <h2>קופצים מעל הבעיות.</h2><p>ארבעה שלבים. כפפות וכובעים.<br>אינסוף תירוצים.</p></main>
    <span class="sticker">עוד קדנציה? קודם עוד קפיצה.</span><footer>לא קמפיין. כן קפיצות.</footer></html>`);
  await page.locator("img").evaluate(image => image.decode());
  await page.screenshot({ path: fileURLToPath(new URL("../assets/share-card.png", import.meta.url)) });
  console.log("Created assets/share-card.png (1200 × 630). No network requests or uploads.");
} finally {
  await browser.close();
}
