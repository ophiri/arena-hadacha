import { CHARGE_CAP, Game, ROSTER } from "./engine.js";
import { CpuController } from "./ai.js";
import { Renderer } from "./renderer.js";

const $ = id => document.getElementById(id);
const canvas = $("game");
const appShell = $("app-shell");
export const game = new Game();
export const session = {
  screen: "home",
  mode: "cpu",
  activeSlot: 0,
  touchEnabled: false,
};

const cpu = new CpuController(1);
const KEYMAP = [
  { left: "KeyA", right: "KeyD", jump: "KeyW", basic: "KeyF", charge: "KeyG" },
  { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp", basic: "KeyK", charge: "KeyL" },
];
const GAME_KEYS = new Set(KEYMAP.flatMap(mapping => Object.values(mapping)));
const heldKeys = new Set();
const touchHeldKeys = new Set();
const activeTouchPointers = new Map();
const queued = KEYMAP.map(() => ({ jumpPressed: false, basicPressed: false, chargeReleased: false }));
const TOUCH_CODES = KEYMAP[0];
const STEP = 1 / 120;
let renderer;
let ready = false;
let soundEnabled = false;
let audioContext;
let lastTimestamp = 0;
let accumulator = 0;
let toastTimer;
let resumeAfterHelp = false;
let resumeAfterInputChoice = false;
let previousState = "";

const spritePaths = {
  bibi: "assets/bibi/idle-0.png",
  benGvir: "assets/ben-gvir/portrait.svg",
  gotliv: "assets/fighters/gotliv-idle.png",
  bennett: "assets/fighters/bennett-idle.png",
  bibiThrow: "assets/fighters/bibi-throw.png",
  benGvirThrow: "assets/fighters/ben-gvir-throw.png",
  gotlivThrow: "assets/fighters/gotliv-throw.png",
  gotlivCharge: "assets/fighters/gotliv-charge.png",
  gotlivProjectile: "assets/fighters/gotliv-projectile.png",
  bennettBasic: "assets/fighters/bennett-basic.png",
  bennettCharge: "assets/fighters/bennett-charge.png",
  bennettProjectile: "assets/fighters/bennett-projectile.png",
  projectiles: "assets/fighters/projectiles-throw.png",
};
const sprites = Object.fromEntries(Object.keys(spritePaths).map(name => [name, new Image()]));

function loadImage(name, image) {
  return new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error(`לא ניתן לטעון את הנכס ${spritePaths[name]}`));
    image.src = spritePaths[name];
  });
}

function clearInput({ cancelCharge = true } = {}) {
  heldKeys.clear();
  touchHeldKeys.clear();
  activeTouchPointers.clear();
  for (const button of document.querySelectorAll("[data-touch-action]")) {
    button.classList.remove("is-held");
    button.setAttribute("aria-pressed", "false");
  }
  for (const input of queued) {
    input.jumpPressed = false;
    input.basicPressed = false;
    input.chargeReleased = false;
  }
  if (cancelCharge) game.cancelCharging();
}

function fighterInput(index) {
  const mapping = KEYMAP[index];
  return {
    left: heldKeys.has(mapping.left) || touchHeldKeys.has(mapping.left),
    right: heldKeys.has(mapping.right) || touchHeldKeys.has(mapping.right),
    jumpHeld: heldKeys.has(mapping.jump) || touchHeldKeys.has(mapping.jump),
    chargeHeld: heldKeys.has(mapping.charge) || touchHeldKeys.has(mapping.charge),
    ...queued[index],
  };
}

function consumeQueuedInput() {
  for (const input of queued) {
    input.jumpPressed = false;
    input.basicPressed = false;
    input.chargeReleased = false;
  }
}

function toast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").classList.add("visible");
  toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 2200);
}

function showScreen(screen) {
  session.screen = screen;
  for (const name of ["home", "select", "arena"]) {
    $(`${name}-screen`).hidden = name !== screen;
  }
  clearInput();
  lastTimestamp = 0;
  accumulator = 0;
  syncTouchUi();
  requestAnimationFrame(() => renderer?.resize());
}

function readSavedInputMode() {
  try {
    return localStorage.getItem("arena-input-mode");
  } catch (error) {
    console.warn("Input preference could not be read:", error);
    return null;
  }
}

function saveInputMode(mode) {
  try {
    localStorage.setItem("arena-input-mode", mode);
  } catch (error) {
    console.warn("Input preference could not be saved:", error);
  }
}

function syncTouchUi() {
  document.body.classList.toggle("touch-enabled", session.touchEnabled);
  $("touch-controls").hidden = !session.touchEnabled || session.screen !== "arena";
  $("input-mode-button").classList.toggle("is-active", session.touchEnabled);
  $("input-mode-button").setAttribute(
    "aria-label",
    session.touchEnabled ? "כפתורי מגע פעילים; שינוי אמצעי שליטה" : "מקלדת פעילה; שינוי אמצעי שליטה",
  );
  const localHint = $("local-mode-button").querySelector("small");
  localHint.textContent = session.touchEnabled
    ? "שחקן 1 במגע, שחקן 2 במקלדת"
    : "שני שחקנים על מקלדת אחת";
  renderer?.resize();
}

function setInputMode(mode, { persist = true } = {}) {
  session.touchEnabled = mode === "touch";
  clearInput();
  syncTouchUi();
  if (persist) saveInputMode(session.touchEnabled ? "touch" : "keyboard");
  if ($("input-dialog").open) $("input-dialog").close();
  if (resumeAfterInputChoice && game.state === "paused") game.pause();
  resumeAfterInputChoice = false;
  syncUI(true);
  if (session.screen === "arena") {
    toast(session.touchEnabled ? "בקר המגע פעיל לשחקן 1." : "חזרנו לשליטה מהמקלדת.");
  }
}

function openInputChoice() {
  resumeAfterInputChoice = session.screen === "arena" && game.state === "playing";
  if (resumeAfterInputChoice) pause();
  clearInput();
  if (!$("input-dialog").open) $("input-dialog").showModal();
}

function cpuOpponentFor(characterId) {
  const index = ROSTER.findIndex(character => character.id === characterId);
  return ROSTER[(index + 1) % ROSTER.length].id;
}

function setGameSelections(selections) {
  if (game.state !== "ready") game.reset("ready");
  game.setSelections(selections);
  updateCharacterUI();
  updateSelectionUI();
}

function openCharacterSelect(mode) {
  session.mode = mode;
  session.activeSlot = 0;
  const playerOne = game.selections[0] || "bibi";
  const playerTwo = mode === "cpu" ? cpuOpponentFor(playerOne) : game.selections[1] || "ben-gvir";
  setGameSelections([playerOne, playerTwo]);
  showScreen("select");
  updateSelectionUI();
  $("fight-button").focus({ preventScroll: true });
}

function returnHome() {
  if (game.state !== "ready") game.reset("ready");
  showScreen("home");
  syncUI(true);
  $("cpu-mode-button").focus({ preventScroll: true });
}

function returnToSelection() {
  if (game.state !== "ready") game.reset("ready");
  session.activeSlot = 0;
  showScreen("select");
  updateCharacterUI();
  updateSelectionUI();
}

function selectCharacter(characterId) {
  const selections = [...game.selections];
  if (session.mode === "cpu") {
    selections[0] = characterId;
    selections[1] = cpuOpponentFor(characterId);
    session.activeSlot = 0;
  } else {
    selections[session.activeSlot] = characterId;
    session.activeSlot = 1 - session.activeSlot;
  }
  setGameSelections(selections);
  playTone(460 + ROSTER.findIndex(character => character.id === characterId) * 55, 0.08, 0, "triangle", 0.025);
}

function buildRoster() {
  const grid = $("roster-grid");
  grid.replaceChildren();
  for (const character of ROSTER) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "roster-card";
    button.dataset.character = character.id;
    button.style.setProperty("--fighter-color", character.color);
    button.setAttribute("aria-label", `בחירת ${character.name}`);

    const image = document.createElement("img");
    image.src = character.portrait;
    image.alt = "";

    const copy = document.createElement("span");
    copy.className = "roster-card-copy";
    const name = document.createElement("b");
    name.textContent = character.name;
    const move = document.createElement("small");
    move.textContent = `${character.basicLabel} · ${character.chargeLabel}`;
    copy.append(name, move);
    button.append(image, copy);
    button.addEventListener("click", () => selectCharacter(character.id));
    grid.append(button);
  }
}

function updateSelectionUI() {
  game.fighters.forEach((fighter, slot) => {
    const panel = $(`selected-fighter-${slot}`);
    panel.style.setProperty("--fighter-color", fighter.color);
    panel.classList.toggle("is-active", session.mode === "local" && session.activeSlot === slot);
    panel.disabled = session.mode === "cpu" && slot === 1;
    $(`selected-image-${slot}`).src = fighter.portrait;
    $(`selected-image-${slot}`).alt = fighter.name;
    $(`selected-name-${slot}`).textContent = fighter.name;
    $(`selected-move-${slot}`).textContent = `${fighter.basicLabel} · ${fighter.chargeLabel}`;
  });

  $("slot-label-0").textContent = "שחקן 1";
  $("slot-label-1").textContent = session.mode === "cpu" ? "מחשב" : "שחקן 2";
  $("select-mode-label").textContent = session.mode === "cpu"
    ? `מול המחשב · היריב: ${game.fighters[1].shortName}`
    : `קרב מקומי · עכשיו בוחר שחקן ${session.activeSlot + 1}`;
  $("mode-plate").textContent = session.mode === "cpu" ? "נגד המחשב" : "2 שחקנים";
  $("selection-callout").replaceChildren();
  const prompt = document.createElement("span");
  prompt.textContent = session.mode === "cpu" ? "בחרו לוחם" : "עכשיו בוחר";
  const chooser = document.createElement("b");
  chooser.textContent = session.mode === "cpu" ? "שחקן 1" : `שחקן ${session.activeSlot + 1}`;
  $("selection-callout").append(prompt, chooser);

  for (const card of document.querySelectorAll(".roster-card")) {
    const selectedSlots = game.selections
      .map((id, slot) => id === card.dataset.character ? slot : -1)
      .filter(slot => slot >= 0);
    card.classList.toggle("is-selected", selectedSlots.length > 0);
    card.dataset.selectedLabel = selectedSlots.map(slot =>
      slot === 0 ? "1P" : session.mode === "cpu" ? "CPU" : "2P").join(" + ");
  }

  $("fight-button").disabled = !ready;
  $("fight-button").textContent = ready
    ? session.mode === "cpu" ? `לקרב נגד ${game.fighters[1].shortName}` : "לקרב!"
    : "טוענים את הלוחמים…";
}

function updateCharacterUI() {
  game.fighters.forEach((fighter, slot) => {
    $(`match-name-${slot}`).textContent = fighter.name;
    $(`hud-name-${slot}`).textContent = fighter.name;
    $(`controls-name-${slot}`).textContent = fighter.name;
    const basicMove = $(`basic-move-${slot}`);
    const chargeMove = $(`charge-move-${slot}`);
    if (basicMove) basicMove.textContent = fighter.basicLabel;
    if (chargeMove) chargeMove.textContent = fighter.chargeLabel;
    const panel = slot === 0 ? $("panel-bibi") : $("panel-ben-gvir");
    panel.style.setProperty("--fighter-color", fighter.color);
    panel.style.setProperty("--fighter-accent", fighter.accent);
  });
  $("hud-slot-1").textContent = session.mode === "cpu" ? "מחשב" : "שחקן 2";
  $("controls-slot-1").textContent = session.mode === "cpu" ? "CPU" : "2P";
  $("match-mode").textContent = session.mode === "cpu" ? "מול המחשב" : "קרב מקומי";
  $("player-two-keys").innerHTML = session.mode === "cpu"
    ? "היריב נשלט על ידי המחשב"
    : '<kbd>←</kbd><kbd>→</kbd> תנועה · <kbd>↑</kbd> קפיצה כפולה · <kbd>K</kbd> <span id="basic-move-1"></span> · <kbd>L</kbd> <span id="charge-move-1"></span>';
  if (session.mode === "local") {
    $("basic-move-1").textContent = game.fighters[1].basicLabel;
    $("charge-move-1").textContent = game.fighters[1].chargeLabel;
  }
  canvas.setAttribute(
    "aria-label",
    `זירת ההדחה. ${game.fighters[0].name} מול ${game.fighters[1].name}. ` +
    (session.touchEnabled
      ? "כפתורי המגע שולטים בתנועה, קפיצה כפולה, מכה ומכת טעינה."
      : "A ו-D לתנועה, W לקפיצה כפולה, F למכה, G למכת טעינה."),
  );
}

function startFight() {
  if (!ready || session.screen !== "select") return;
  game.startRound();
  cpu.reset();
  renderer.particles = [];
  renderer.words = [];
  updateCharacterUI();
  showScreen("arena");
  syncUI(true);
  canvas.focus({ preventScroll: true });
  toast(session.touchEnabled
    ? "בקר המגע פעיל. את כפתור הברק מחזיקים ומשחררים."
    : session.mode === "cpu"
      ? "המחשב נכנס לזירה. אל תתנו לו זמן לטעון."
      : "שני שחקנים. מקלדת אחת. בלי תירוצים.");
}

function startOrResume() {
  if (!ready || session.screen !== "arena") return;
  if (game.state === "paused") game.pause();
  else if (game.state === "roundOver") {
    game.startRound();
    cpu.reset();
    renderer.particles = [];
    renderer.words = [];
  }
  clearInput();
  canvas.focus({ preventScroll: true });
  syncUI(true);
}

function restartRound() {
  if (!ready || session.screen !== "arena" || game.state === "ready") return;
  game.reset("playing");
  game.emit("roundStart", { round: game.round });
  cpu.reset();
  clearInput();
  renderer.particles = [];
  renderer.words = [];
  canvas.focus({ preventScroll: true });
  syncUI(true);
  toast("משחק חוזר. כל האחוזים נמחקו.");
}

function pause() {
  if (!ready || session.screen !== "arena" || !["playing", "paused"].includes(game.state)) return;
  game.pause();
  clearInput();
  syncUI(true);
  if (game.state === "playing") canvas.focus({ preventScroll: true });
}

function openHelp() {
  resumeAfterHelp = session.screen === "arena" && game.state === "playing";
  if (resumeAfterHelp) pause();
  clearInput();
  $("help-dialog").showModal();
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement === appShell) await document.exitFullscreen();
    else await appShell.requestFullscreen();
  } catch (error) {
    console.warn("Fullscreen unavailable:", error);
    if (session.screen === "arena") toast("לא ניתן לפתוח מסך מלא. אפשר להמשיך לשחק כאן.");
  }
}

function playTone(frequency, duration, delay = 0, type = "square", volume = 0.035) {
  if (!soundEnabled || !audioContext || audioContext.state !== "running") return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const start = audioContext.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * 0.72), start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}

async function toggleSound() {
  if (!soundEnabled) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("Web Audio אינו נתמך.");
      audioContext ||= new AudioContextClass();
      await audioContext.resume();
      soundEnabled = true;
    } catch (error) {
      console.error("Sound unavailable:", error);
      if (session.screen === "arena") toast("הצליל אינו זמין בדפדפן הזה. המשחק ממשיך כרגיל.");
      return;
    }
  } else {
    soundEnabled = false;
  }
  $("sound-button").setAttribute("aria-pressed", String(soundEnabled));
  $("sound-button").setAttribute("aria-label", soundEnabled ? "השתקת צליל" : "הפעלת צליל");
  $("sound-waves").setAttribute("d", soundEnabled ? "M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" : "m16 9 5 6m0-6-5 6");
  playTone(540, 0.12);
}

function updateHud() {
  game.fighters.forEach((fighter, index) => {
    const suffix = index === 0 ? "bibi" : "ben-gvir";
    const damageRatio = Math.min(1, fighter.damage / 180);
    const chargeRatio = Math.min(1, fighter.charge / CHARGE_CAP);
    $(`damage-${suffix}`).textContent = `${fighter.damage}%`;
    $(`damage-fill-${suffix}`).style.transform = `scaleX(${damageRatio})`;
    $(`charge-fill-${suffix}`).style.transform = `scaleX(${chargeRatio})`;
    const panel = index === 0 ? $("panel-bibi") : $("panel-ben-gvir");
    panel.classList.toggle("is-charging", fighter.attack?.kind === "charging");
    panel.classList.toggle("is-maxed", chargeRatio === 1);
    panel.dataset.danger = fighter.damage >= 100 ? "high" : fighter.damage >= 55 ? "medium" : "low";
  });
}

function syncUI(force = false) {
  const signature = `${session.screen}:${session.mode}:${game.state}:${game.winner?.slot ?? ""}:${game.round}:${game.selections.join(",")}`;
  if (!force && signature === previousState) return;
  previousState = signature;
  const overlay = $("overlay");
  const paused = game.state === "paused";
  const roundOver = game.state === "roundOver";
  overlay.hidden = session.screen !== "arena" || game.state === "playing" || game.state === "ready";
  $("pause-button").disabled = session.screen !== "arena" || roundOver;
  $("restart-button").disabled = session.screen !== "arena" || game.state === "ready";
  $("pause-button").setAttribute("aria-label", paused ? "המשך המשחק" : "השהיית המשחק");
  $("pause-icon").setAttribute("d", paused ? "m8 5 10 7-10 7V5Z" : "M8 5v14M16 5v14");

  if (paused) {
    $("overlay-title").textContent = "הקרב בהשהיה";
    $("overlay-description").textContent = "הזירה קפאה. שום נזק, טעינה או נפילה לא מתקדמים עד שחוזרים.";
    $("play-button").textContent = "חוזרים לזירה";
    $("overlay-hint").innerHTML = "<kbd>P</kbd> או <kbd>Esc</kbd> להמשך";
    $("round-label").textContent = "המשחק בהשהיה";
    $("round-status").textContent = "הסיבוב מושהה";
  } else if (roundOver) {
    const playerWon = session.mode !== "cpu" || game.winner.slot === 0;
    $("overlay-title").textContent = session.mode === "cpu" && !playerWon ? "המחשב ניצח" : `${game.winner.name} ניצח!`;
    $("overlay-description").textContent = `${game.loser.name} יצא מגבולות הזירה עם ${game.loser.damage}% נזק. אפשר להתחיל מיד משחק חוזר או להחליף לוחמים.`;
    $("play-button").textContent = "משחק חוזר";
    $("overlay-hint").innerHTML = "<kbd>Enter</kbd> או <kbd>R</kbd> לסיבוב נוסף";
    $("round-label").textContent = `רינג־אאוט: ${game.winner.shortName} נשאר בזירה`;
    $("round-status").textContent = `${game.winner.name} ניצח ברינג־אאוט`;
    $("play-button").focus({ preventScroll: true });
  } else if (game.state === "playing") {
    $("round-label").textContent = `סיבוב ${game.round} · הראשון שמועף מפסיד`;
    $("round-status").textContent = "הסיבוב פעיל";
  }
}

function handleEvents() {
  for (const event of game.drainEvents()) {
    renderer.handleEvent(event);
    if (event.type === "jump") {
      playTone(event.slot === 0 ? 360 : 410, 0.09, 0, "triangle");
    } else if (event.type === "doubleJump") {
      playTone(event.slot === 0 ? 520 : 580, 0.1, 0, "triangle");
      playTone(event.slot === 0 ? 690 : 750, 0.12, 0.05, "triangle", 0.025);
    } else if (event.type === "attack") {
      playTone(event.kind === "charge" ? 140 : 230, event.kind === "charge" ? 0.2 : 0.08, 0, "square", event.kind === "charge" ? 0.06 : 0.025);
    } else if (event.type === "projectileThrow") {
      const frequency = event.projectile === "bomb-pad" ? 310
        : event.projectile === "objection" ? 390
          : event.projectile === "speech-bubble" ? 445 : 260;
      playTone(frequency, 0.12, 0, "sawtooth", 0.035);
    } else if (event.type === "chargeStart") {
      playTone(185, 0.08, 0, "sawtooth", 0.018);
    } else if (event.type === "chargeReady") {
      playTone(620, 0.12, 0, "triangle");
      playTone(820, 0.16, 0.08, "triangle");
    } else if (event.type === "hit") {
      playTone(event.power > 0.6 ? 90 : 125, event.power > 0.6 ? 0.24 : 0.12, 0, "square", 0.055);
      if (event.power > 0.78) toast(`מכת טעינה מלאה: ${event.damage}% נזק, הדיפה ${event.knockback}.`);
    } else if (event.type === "ringOut") {
      clearInput();
      [392, 523, 659].forEach((frequency, index) => playTone(frequency, 0.28, index * 0.09, "triangle", 0.05));
    }
  }
}

function frame(timestamp) {
  const frameTime = lastTimestamp ? Math.min((timestamp - lastTimestamp) / 1000, 0.1) : 0;
  lastTimestamp = timestamp;
  accumulator += frameTime;
  while (accumulator >= STEP) {
    const secondInput = session.mode === "cpu" ? cpu.update(game, STEP) : fighterInput(1);
    game.update(STEP, [fighterInput(0), secondInput]);
    consumeQueuedInput();
    handleEvents();
    accumulator -= STEP;
  }
  syncUI();
  updateHud();
  renderer.draw(game, timestamp / 1000, frameTime);
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", event => {
  if (!ready || event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
  if (target instanceof HTMLButtonElement && ["Space", "Enter"].includes(event.code)) return;
  if ($("help-dialog").open) return;

  if (event.code === "KeyM" && !event.repeat) {
    toggleSound();
    return;
  }
  if (session.screen === "home") {
    if (event.code === "Enter" && !event.repeat) openCharacterSelect("cpu");
    if (event.code === "ArrowDown" && !event.repeat) openCharacterSelect("local");
    return;
  }
  if (session.screen === "select") {
    if (event.code === "Enter" && !event.repeat) startFight();
    if (event.code === "Escape" && !event.repeat) returnHome();
    return;
  }
  if (event.code === "Enter" && !event.repeat && game.state === "roundOver") {
    event.preventDefault();
    startOrResume();
    return;
  }
  if (["Escape", "KeyP"].includes(event.code) && !event.repeat) {
    event.preventDefault();
    pause();
    return;
  }
  if (event.code === "KeyR" && !event.repeat) {
    event.preventDefault();
    restartRound();
    return;
  }
  if (!GAME_KEYS.has(event.code)) return;
  event.preventDefault();
  if (game.state !== "playing") return;
  const index = KEYMAP.findIndex(mapping => Object.values(mapping).includes(event.code));
  if (session.mode === "cpu" && index === 1) return;
  const mapping = KEYMAP[index];
  if (!event.repeat && !heldKeys.has(event.code)) {
    if (event.code === mapping.jump) queued[index].jumpPressed = true;
    if (event.code === mapping.basic) queued[index].basicPressed = true;
  }
  heldKeys.add(event.code);
});

window.addEventListener("keyup", event => {
  const index = KEYMAP.findIndex(mapping => mapping.charge === event.code);
  if (index >= 0 && heldKeys.has(event.code) && game.state === "playing") queued[index].chargeReleased = true;
  heldKeys.delete(event.code);
  if (GAME_KEYS.has(event.code)) event.preventDefault();
});

function pressTouchControl(event) {
  if (!session.touchEnabled || session.screen !== "arena" || game.state !== "playing") return;
  const button = event.currentTarget;
  const action = button.dataset.touchAction;
  const code = TOUCH_CODES[action];
  if (!code || activeTouchPointers.has(event.pointerId)) return;
  event.preventDefault();
  activeTouchPointers.set(event.pointerId, code);
  if (!touchHeldKeys.has(code)) {
    if (action === "jump") queued[0].jumpPressed = true;
    if (action === "basic") queued[0].basicPressed = true;
  }
  touchHeldKeys.add(code);
  button.classList.add("is-held");
  button.setAttribute("aria-pressed", "true");
}

function releaseTouchControl(event) {
  const code = activeTouchPointers.get(event.pointerId);
  if (!code) return;
  event.preventDefault();
  activeTouchPointers.delete(event.pointerId);
  if ([...activeTouchPointers.values()].includes(code)) return;
  if (code === TOUCH_CODES.charge && touchHeldKeys.has(code) && game.state === "playing") {
    queued[0].chargeReleased = true;
  }
  touchHeldKeys.delete(code);
  const action = Object.entries(TOUCH_CODES).find(([, mappedCode]) => mappedCode === code)?.[0];
  const button = document.querySelector(`[data-touch-action="${action}"]`);
  button?.classList.remove("is-held");
  button?.setAttribute("aria-pressed", "false");
}

window.addEventListener("blur", () => {
  if (session.screen === "arena" && game.state === "playing") game.pause();
  clearInput();
  syncUI(true);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && session.screen === "arena" && game.state === "playing") game.pause();
  if (document.hidden) clearInput();
  lastTimestamp = 0;
  accumulator = 0;
  syncUI(true);
});

window.addEventListener("resize", () => renderer?.resize());
$("cpu-mode-button").addEventListener("click", () => openCharacterSelect("cpu"));
$("local-mode-button").addEventListener("click", () => openCharacterSelect("local"));
$("select-back-button").addEventListener("click", returnHome);
$("home-button").addEventListener("click", returnHome);
$("selected-fighter-0").addEventListener("click", () => {
  session.activeSlot = 0;
  updateSelectionUI();
});
$("selected-fighter-1").addEventListener("click", () => {
  if (session.mode !== "local") return;
  session.activeSlot = 1;
  updateSelectionUI();
});
$("fight-button").addEventListener("click", startFight);
$("play-button").addEventListener("click", startOrResume);
$("restart-button").addEventListener("click", restartRound);
$("pause-button").addEventListener("click", pause);
$("sound-button").addEventListener("click", toggleSound);
$("input-mode-button").addEventListener("click", openInputChoice);
$("touch-mode-choice").addEventListener("click", () => setInputMode("touch"));
$("keyboard-mode-choice").addEventListener("click", () => setInputMode("keyboard"));
$("help-button").addEventListener("click", openHelp);
$("fullscreen-button").addEventListener("click", toggleFullscreen);
$("change-fighters-button").addEventListener("click", returnToSelection);
$("menu-button").addEventListener("click", returnHome);
$("help-dialog").addEventListener("close", () => {
  if (resumeAfterHelp && game.state === "paused") game.pause();
  resumeAfterHelp = false;
  clearInput();
  syncUI(true);
  if (session.screen === "arena") canvas.focus({ preventScroll: true });
});
document.addEventListener("fullscreenchange", () => {
  const active = document.fullscreenElement === appShell;
  $("fullscreen-button").setAttribute("aria-label", active ? "יציאה ממסך מלא" : "מסך מלא");
  renderer?.resize();
});

for (const button of document.querySelectorAll("[data-touch-action]")) {
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("pointerdown", pressTouchControl);
}
window.addEventListener("pointerup", releaseTouchControl);
window.addEventListener("pointercancel", releaseTouchControl);
$("input-dialog").addEventListener("cancel", () => setInputMode("keyboard"));

if (!appShell.requestFullscreen) $("fullscreen-button").hidden = true;

const savedInputMode = readSavedInputMode();
setInputMode(savedInputMode === "touch" ? "touch" : "keyboard", { persist: false });
if (!savedInputMode && matchMedia("(pointer: coarse)").matches) {
  requestAnimationFrame(openInputChoice);
}

buildRoster();
updateSelectionUI();

Promise.all(Object.entries(sprites).map(([name, image]) => loadImage(name, image)))
  .then(() => {
    renderer = new Renderer(canvas, sprites);
    ready = true;
    updateCharacterUI();
    updateSelectionUI();
    syncUI(true);
    updateHud();
    requestAnimationFrame(frame);
  })
  .catch(error => {
    console.error("Game assets failed to load:", error);
    $("fight-button").textContent = "אחד מנכסי המשחק חסר";
    $("fight-button").disabled = true;
  });
