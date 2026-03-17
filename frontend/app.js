const query = new URLSearchParams(window.location.search);
const queryApi = query.get("api");
const configuredApi = (window.GAME_API_BASE || "").trim();
const API_BASE = (queryApi || configuredApi || (window.location.hostname === "localhost" ? "/api" : "")).replace(/\/$/, "");

const forceMobile = query.get("mobile") === "1";
const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0 || "ontouchstart" in window;
if (forceMobile || isTouchDevice) {
  document.body.classList.add("mobile-controls-enabled");
}

function buildApiUrl(path) {
  if (!API_BASE) {
    return null;
  }
  if (API_BASE.startsWith("http://") || API_BASE.startsWith("https://")) {
    return `${API_BASE}${path}`;
  }
  return `${API_BASE}${path}`;
}

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const hpEl = document.getElementById("hp");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const waveEl = document.getElementById("wave");
const spawnRateEl = document.getElementById("spawnRate");
const canvasWrapEl = document.getElementById("canvasWrap");
const crosshairEl = document.getElementById("crosshair");
const crosshairAmmoEl = document.getElementById("crosshairAmmo");
const crosshairCdFillEl = document.getElementById("crosshairCdFill");
const leftStickZoneEl = document.getElementById("leftStickZone");
const leftStickKnobEl = document.getElementById("leftStickKnob");
const rightStickZoneEl = document.getElementById("rightStickZone");
const rightStickKnobEl = document.getElementById("rightStickKnob");
const rollBtnEl = document.getElementById("rollBtn");
const burstBtnEl = document.getElementById("burstBtn");
const leaderboardListEl = document.getElementById("leaderboardList");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const submitCard = document.getElementById("submitCard");
const finalScoreEl = document.getElementById("finalScore");
const playerNameEl = document.getElementById("playerName");
const submitScoreBtn = document.getElementById("submitScoreBtn");
const submitStatusEl = document.getElementById("submitStatus");

const assets = {
  bg: loadImage("./assets/Sprites/ForestBackground.png"),
  foxy: loadImage("./assets/Sprites/Foxy.png"),
  slimer: loadImage("./assets/Sprites/Slimer.png"),
  slimerDeath: loadImage("./assets/Sprites/SlimerDeath.png"),
  bullet: loadImage("./assets/Sprites/Bullet.png"),
};

const sounds = {
  bgm: loadAudio("./assets/Audio/BGM.ogg", 0.25, true),
  gun: loadAudio("./assets/Audio/Gun.mp3", 0.35, false),
  death: loadAudio("./assets/Audio/EnemyDeath.mp3", 0.4, false),
  gameover: loadAudio("./assets/Audio/GameOver.mp3", 0.5, false),
};

const SPRITES = {
  player: {
    animations: {
      // Row 1 (idle), row 2 (move), row 9 (death), row 10 (roll)
      idle: [
        { x: 2, y: 0, w: 32, h: 32 },
        { x: 34, y: 0, w: 32, h: 32 },
        { x: 66, y: 0, w: 32, h: 32 },
        { x: 98, y: 0, w: 32, h: 32 },
      ],
      move: [
        { x: 2, y: 32, w: 32, h: 32 },
        { x: 34, y: 32, w: 32, h: 32 },
        { x: 66, y: 32, w: 32, h: 32 },
        { x: 98, y: 32, w: 32, h: 32 },
        { x: 130, y: 32, w: 32, h: 32 },
        { x: 162, y: 32, w: 32, h: 32 },
      ],
      death: [
        { x: 2, y: 256, w: 32, h: 32 },
        { x: 34, y: 256, w: 32, h: 32 },
        { x: 66, y: 256, w: 32, h: 32 },
        { x: 98, y: 256, w: 32, h: 32 },
        { x: 130, y: 256, w: 32, h: 32 },
        { x: 162, y: 256, w: 32, h: 32 },
      ],
      roll: [
        { x: 2, y: 288, w: 32, h: 32 },
        { x: 34, y: 288, w: 32, h: 32 },
        { x: 66, y: 288, w: 32, h: 32 },
        { x: 98, y: 288, w: 32, h: 32 },
      ],
    },
    drawW: 58,
    drawH: 54,
  },
  enemy: {
    frameW: 41,
    frameH: 38,
    cols: 8,
    drawW: 52,
    drawH: 48,
  },
  enemyDeath: {
    frameW: 64,
    frameH: 58,
    cols: 7,
    drawW: 60,
    drawH: 62,
  },
};

const WORLD = {
  width: canvas.width * 3,
  height: canvas.height,
  lowerThirdTop: Math.floor((canvas.height * 2) / 3),
  margin: 24,
};

const ENEMY_TYPES = [
  { kind: "green", hp: 1, probability: 0.62, filter: "none" },
  { kind: "blue", hp: 2, probability: 0.26, filter: "hue-rotate(170deg) saturate(1.15)" },
  { kind: "yellow", hp: 3, probability: 0.12, filter: "hue-rotate(310deg) saturate(1.35) brightness(1.05)" },
];

const game = {
  state: "menu",
  keys: {},
  touch: { moveX: 0, moveY: 0, aimX: 1, aimY: 0, shooting: false },
  lastTime: 0,
  elapsed: 0,
  spawnTimer: 0,
  wave: 1,
  spawnRate: 0.8,
  score: 0,
  enemies: [],
  bullets: [],
  particles: [],
  player: null,
  mouse: { x: canvas.width / 2, y: canvas.height / 2 },
  cameraX: 0,
  audioUnlocked: false,
};

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function loadAudio(src, volume, loop) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.loop = loop;
  return audio;
}

function playSfx(audio, options = {}) {
  if (!game.audioUnlocked) {
    return;
  }
  const node = audio.cloneNode(true);
  const volumeScale = options.volumeScale ?? 1;
  node.volume = Math.max(0, Math.min(1, audio.volume * volumeScale));
  if (options.playbackRate) {
    node.playbackRate = options.playbackRate;
  }
  node.play().catch(() => {});
}

function playBurstSfx() {
  // Layer two slightly detuned gun sounds for a heavier burst feel.
  playSfx(sounds.gun, { playbackRate: 0.86, volumeScale: 1.25 });
  playSfx(sounds.gun, { playbackRate: 0.74, volumeScale: 0.9 });
}

function unlockAudio() {
  if (game.audioUnlocked) {
    return;
  }
  game.audioUnlocked = true;
  sounds.bgm.play().then(() => sounds.bgm.pause()).catch(() => {});
}

function resetGame() {
  game.state = "playing";
  game.lastTime = 0;
  game.elapsed = 0;
  game.spawnTimer = 0;
  game.wave = 1;
  game.spawnRate = 0.8;
  game.score = 0;
  game.enemies = [];
  game.bullets = [];
  game.particles = [];
  const minY = WORLD.lowerThirdTop + WORLD.margin;
  const maxY = WORLD.height - WORLD.margin;
  game.player = {
    x: WORLD.width / 2,
    y: (minY + maxY) / 2,
    speed: 230,
    hp: 100,
    radius: 18,
    facingX: 1,
    facingY: 0,
    frameTime: 0,
    frame: 0,
    anim: "idle",
    cooldown: 0,
    ammo: 6,
    maxAmmo: 6,
    isRolling: false,
    rollDirX: 0,
    rollDirY: 0,
    rollTimeLeft: 0,
    rollDuration: 0.24,
    rollCooldown: 2,
    rollCooldownLeft: 0,
  };
  game.cameraX = clamp(game.player.x - canvas.width / 2, 0, WORLD.width - canvas.width);
  game.mouse.x = game.player.x;
  game.mouse.y = game.player.y;
  submitCard.classList.add("hidden");
  submitStatusEl.textContent = "";
  submitStatusEl.className = "";

  sounds.bgm.currentTime = 0;
  if (game.audioUnlocked) {
    sounds.bgm.play().catch(() => {});
  }

  updateCrosshairAmmo();
}

function updateCrosshairAmmo() {
  const p = game.player;
  if (!p) {
    crosshairAmmoEl.textContent = "0/0";
    crosshairEl.classList.add("empty");
    crosshairCdFillEl.style.width = "0%";
    return;
  }
  crosshairAmmoEl.textContent = `${p.ammo}/${p.maxAmmo}`;
  crosshairEl.classList.toggle("empty", p.ammo <= 0);
  const cdRatio = p.rollCooldown > 0 ? p.rollCooldownLeft / p.rollCooldown : 0;
  crosshairCdFillEl.style.width = `${Math.max(0, Math.min(1, cdRatio)) * 100}%`;
}

function getInputMoveVector() {
  let mx = game.touch.moveX;
  let my = game.touch.moveY;
  if (game.keys.KeyW) my -= 1;
  if (game.keys.KeyS) my += 1;
  if (game.keys.KeyA) mx -= 1;
  if (game.keys.KeyD) mx += 1;
  const len = Math.hypot(mx, my) || 1;
  return { x: mx / len, y: my / len, rawX: mx, rawY: my };
}

function startRoll() {
  const p = game.player;
  if (!p || game.state !== "playing" || p.isRolling || p.rollCooldownLeft > 0) {
    return;
  }

  const vec = getInputMoveVector();
  let dirX = vec.x;
  let dirY = vec.y;
  if (vec.rawX === 0 && vec.rawY === 0) {
    const facingLen = Math.hypot(p.facingX, p.facingY) || 1;
    dirX = p.facingX / facingLen;
    dirY = p.facingY / facingLen;
  }

  p.isRolling = true;
  p.rollDirX = dirX;
  p.rollDirY = dirY;
  p.rollTimeLeft = p.rollDuration;
  p.rollCooldownLeft = p.rollCooldown;
  p.ammo = p.maxAmmo;
  p.anim = "roll";
  p.frame = 0;
  p.frameTime = 0;
  updateCrosshairAmmo();
}

function rollEnemyType() {
  const r = Math.random();
  let acc = 0;
  for (const item of ENEMY_TYPES) {
    acc += item.probability;
    if (r <= acc) {
      return item;
    }
  }
  return ENEMY_TYPES[0];
}

function spawnEnemy() {
  const cameraLeft = game.cameraX;
  const cameraRight = game.cameraX + canvas.width;
  const spawnPad = 70;
  const edge = Math.floor(Math.random() * 2);
  const minY = WORLD.lowerThirdTop + WORLD.margin;
  const maxY = WORLD.height - WORLD.margin;
  const speedMin = Math.min(180, 56 + game.wave * 4);
  const speedMax = Math.min(240, 88 + game.wave * 6);
  const speed = speedMin + Math.random() * (speedMax - speedMin);
  const animInterval = clamp(0.14 - speed * 0.00035, 0.045, 0.12);
  const enemyType = rollEnemyType();
  let x = 0;
  let y = 0;
  if (edge === 0) {
    x = cameraLeft - spawnPad;
    y = minY + Math.random() * (maxY - minY);
  } else {
    x = cameraRight + spawnPad;
    y = minY + Math.random() * (maxY - minY);
  }

  game.enemies.push({
    x,
    y,
    hp: enemyType.hp,
    maxHp: enemyType.hp,
    kind: enemyType.kind,
    filter: enemyType.filter,
    speed,
    radius: 16,
    frame: 0,
    frameTime: 0,
    animInterval,
  });
}

function shoot() {
  const p = game.player;
  if (game.state !== "playing" || !p || p.cooldown > 0 || p.isRolling || p.ammo <= 0) {
    return;
  }

  let ax = game.mouse.x - p.x;
  let ay = game.mouse.y - p.y;
  const len = Math.hypot(ax, ay) || 1;
  ax /= len;
  ay /= len;

  p.facingX = ax;
  p.facingY = ay;

  const shotX = p.x;
  const shotY = p.y + 8;

  game.bullets.push({
    x: shotX,
    y: shotY,
    vx: ax * 690,
    vy: ay * 690,
    radius: 5,
    drawSize: 12,
    life: 1.1,
    damage: 1,
  });
  p.ammo -= 1;
  p.ammo = Math.max(0, p.ammo);
  p.cooldown = 0.2;
  playSfx(sounds.gun);
  updateCrosshairAmmo();
}

function burstShoot() {
  const p = game.player;
  if (game.state !== "playing" || !p || p.isRolling || p.ammo <= 0) {
    return;
  }

  const bulletCount = p.ammo;
  let baseX = game.mouse.x - p.x;
  let baseY = game.mouse.y - p.y;
  const baseLen = Math.hypot(baseX, baseY) || 1;
  baseX /= baseLen;
  baseY /= baseLen;
  const baseAngle = Math.atan2(baseY, baseX);
  const halfFan = Math.PI / 6;

  for (let i = 0; i < bulletCount; i += 1) {
    const angle = baseAngle + (Math.random() * 2 - 1) * halfFan;
    const ax = Math.cos(angle);
    const ay = Math.sin(angle);
    game.bullets.push({
      x: p.x,
      y: p.y + 8,
      vx: ax * 690,
      vy: ay * 690,
      radius: 5,
      drawSize: 12,
      life: 0.55,
      damage: 2,
    });
  }

  p.ammo = 0;
  p.cooldown = 0.15;
  playBurstSfx();
  updateCrosshairAmmo();
}

function shootToNearestEnemy() {
  if (game.state !== "playing" || !game.enemies.length || !game.player) {
    return;
  }
  let nearest = null;
  let minDist = Number.POSITIVE_INFINITY;
  for (const e of game.enemies) {
    const d = (e.x - game.player.x) ** 2 + (e.y - game.player.y) ** 2;
    if (d < minDist) {
      minDist = d;
      nearest = e;
    }
  }
  if (!nearest) {
    return;
  }
  game.mouse.x = nearest.x;
  game.mouse.y = nearest.y;
  shoot();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function update(dt) {
  if (game.state !== "playing" && game.state !== "gameover") {
    return;
  }

  const p = game.player;

  if (game.state === "gameover") {
    const deathFrames = SPRITES.player.animations.death;
    p.anim = "death";
    p.frameTime += dt;
    if (p.frameTime > 0.24) {
      p.frameTime = 0;
      p.frame = (p.frame + 1) % deathFrames.length;
    }
    hpEl.textContent = "0";
    scoreEl.textContent = `${game.score}`;
    timeEl.textContent = `${Math.floor(game.elapsed)}`;
    waveEl.textContent = `${game.wave}`;
    spawnRateEl.textContent = game.spawnRate.toFixed(2);
    updateCrosshairAmmo();
    return;
  }

  game.elapsed += dt;
  game.wave = Math.floor(game.elapsed / 20) + 1;
  game.spawnRate = Math.min(4.2, 0.8 + (game.wave - 1) * 0.25);
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.rollCooldownLeft = Math.max(0, p.rollCooldownLeft - dt);

  if (game.touch.shooting) {
    const aimLen = Math.hypot(game.touch.aimX, game.touch.aimY) || 1;
    game.mouse.x = p.x + (game.touch.aimX / aimLen) * 120;
    game.mouse.y = p.y + (game.touch.aimY / aimLen) * 120;
    shoot();
  }

  const moveVec = getInputMoveVector();
  const mx = moveVec.x;
  const my = moveVec.y;

  if (p.isRolling) {
    p.anim = "roll";
    p.frameTime += dt;
    if (p.frameTime > 0.06) {
      p.frame = (p.frame + 1) % SPRITES.player.animations.roll.length;
      p.frameTime = 0;
    }
    p.x += p.rollDirX * p.speed * 3 * dt;
    p.y += p.rollDirY * p.speed * 3 * dt;
    p.rollTimeLeft -= dt;
    if (p.rollTimeLeft <= 0) {
      p.isRolling = false;
      p.frame = 0;
      p.frameTime = 0;
      p.anim = "idle";
    }
  } else {
    p.x += mx * p.speed * dt;
    p.y += my * p.speed * dt;
    if (mx !== 0 || my !== 0) {
      p.anim = "move";
      p.frameTime += dt;
      if (p.frameTime > 0.1) {
        p.frame = (p.frame + 1) % SPRITES.player.animations.move.length;
        p.frameTime = 0;
      }
      p.facingX = mx;
      p.facingY = my;
    } else {
      p.anim = "idle";
      p.frame = 0;
    }
  }

  p.x = clamp(p.x, WORLD.margin, WORLD.width - WORLD.margin);
  p.y = clamp(p.y, WORLD.lowerThirdTop + WORLD.margin, WORLD.height - WORLD.margin);
  game.cameraX = clamp(p.x - canvas.width / 2, 0, WORLD.width - canvas.width);

  game.spawnTimer -= dt;
  const spawnInterval = 1 / game.spawnRate;
  while (game.spawnTimer <= 0) {
    spawnEnemy();
    game.spawnTimer += spawnInterval;
  }

  for (const bullet of game.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
  }
  game.bullets = game.bullets.filter(
    (b) =>
      b.life > 0 &&
      b.x > -30 &&
      b.x < WORLD.width + 30 &&
      b.y > WORLD.lowerThirdTop - 30 &&
      b.y < WORLD.height + 30
  );

  for (const enemy of game.enemies) {
    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    const d = Math.hypot(dx, dy) || 1;
    enemy.x += (dx / d) * enemy.speed * dt;
    enemy.y += (dy / d) * enemy.speed * dt;
    enemy.x = clamp(enemy.x, -40, WORLD.width + 40);
    enemy.y = clamp(enemy.y, WORLD.lowerThirdTop + WORLD.margin, WORLD.height - WORLD.margin);

    enemy.frameTime += dt;
    if (enemy.frameTime > enemy.animInterval) {
      enemy.frame = (enemy.frame + 1) % SPRITES.enemy.cols;
      enemy.frameTime = 0;
    }

    if (d < enemy.radius + p.radius) {
      p.hp -= (p.isRolling ? 9 : 18) * dt;
    }
  }

  for (const bullet of game.bullets) {
    for (const enemy of game.enemies) {
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const d = Math.hypot(dx, dy);
      if (d < bullet.radius + enemy.radius) {
        bullet.life = 0;
        enemy.hp -= bullet.damage || 1;
        if (enemy.hp <= 0) {
          game.score += 10 * (enemy.maxHp || 1);
          game.particles.push({
            x: enemy.x,
            y: enemy.y,
            t: 0,
            frame: 0,
          });
          playSfx(sounds.death);
        }
      }
    }
  }

  game.enemies = game.enemies.filter((e) => e.hp > 0);

  for (const particle of game.particles) {
    particle.t += dt;
    particle.frame = Math.floor(particle.t / 0.06);
  }
  game.particles = game.particles.filter((pfx) => pfx.frame < SPRITES.enemyDeath.cols);

  if (p.hp <= 0) {
    game.state = "gameover";
    p.anim = "death";
    p.isRolling = false;
    p.frame = 0;
    p.frameTime = 0;
    sounds.bgm.pause();
    playSfx(sounds.gameover);
    finalScoreEl.textContent = `${game.score}`;
    submitCard.classList.remove("hidden");
    game.keys = {};
    game.touch = { moveX: 0, moveY: 0, aimX: 1, aimY: 0, shooting: false };
  }

  hpEl.textContent = Math.max(0, Math.floor(p.hp));
  scoreEl.textContent = `${game.score}`;
  timeEl.textContent = `${Math.floor(game.elapsed)}`;
  waveEl.textContent = `${game.wave}`;
  spawnRateEl.textContent = game.spawnRate.toFixed(2);
  updateCrosshairAmmo();
}

function drawBackground() {
  if (assets.bg.complete && assets.bg.naturalWidth > 0) {
    const tileW = Math.round((assets.bg.naturalWidth / assets.bg.naturalHeight) * canvas.height);
    const startTile = Math.floor(game.cameraX / tileW);
    const offsetX = -(game.cameraX - startTile * tileW);
    const need = Math.ceil(canvas.width / tileW) + 2;
    for (let i = 0; i < need; i += 1) {
      const x = offsetX + i * tileW;
      ctx.drawImage(assets.bg, x, 0, tileW, canvas.height);
    }
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#1d4f41");
    grad.addColorStop(1, "#102923");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawPlayer(p) {
  const frames = SPRITES.player.animations[p.anim] || SPRITES.player.animations.idle;
  const frame = frames[p.frame % frames.length];

  if (assets.foxy.complete && assets.foxy.naturalWidth >= frame.x + frame.w && assets.foxy.naturalHeight >= frame.y + frame.h) {
    const sx = frame.x;
    const sy = frame.y;

    ctx.save();
    const screenX = p.x - game.cameraX;
    ctx.translate(screenX, p.y);
    if (p.facingX < 0) {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      assets.foxy,
      sx,
      sy,
      frame.w,
      frame.h,
      -SPRITES.player.drawW / 2,
      -SPRITES.player.drawH / 2,
      SPRITES.player.drawW,
      SPRITES.player.drawH
    );
    ctx.restore();
  } else {
    ctx.fillStyle = "#ff9f68";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const e of game.enemies) {
    const screenX = e.x - game.cameraX;
    if (screenX < -80 || screenX > canvas.width + 80) {
      continue;
    }
    if (assets.slimer.complete && assets.slimer.naturalWidth >= SPRITES.enemy.frameW) {
      const sx = (e.frame % SPRITES.enemy.cols) * SPRITES.enemy.frameW;
      ctx.save();
      if (e.filter && e.filter !== "none") {
        ctx.filter = e.filter;
      }
      ctx.drawImage(
        assets.slimer,
        sx,
        0,
        SPRITES.enemy.frameW,
        SPRITES.enemy.frameH,
        screenX - SPRITES.enemy.drawW / 2,
        e.y - SPRITES.enemy.drawH / 2,
        SPRITES.enemy.drawW,
        SPRITES.enemy.drawH
      );
      ctx.restore();
    } else {
      ctx.fillStyle = "#58e63f";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBullets() {
  for (const b of game.bullets) {
    const screenX = b.x - game.cameraX;
    if (screenX < -30 || screenX > canvas.width + 30) {
      continue;
    }
    if (assets.bullet.complete && assets.bullet.naturalWidth > 0) {
      const size = b.drawSize || b.radius * 2;
      ctx.drawImage(assets.bullet, screenX - size / 2, b.y - size / 2, size, size);
    } else {
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.arc(screenX, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawParticles() {
  for (const pfx of game.particles) {
    const screenX = pfx.x - game.cameraX;
    if (screenX < -80 || screenX > canvas.width + 80) {
      continue;
    }
    if (assets.slimerDeath.complete && assets.slimerDeath.naturalWidth >= SPRITES.enemyDeath.frameW) {
      const sx = (pfx.frame % SPRITES.enemyDeath.cols) * SPRITES.enemyDeath.frameW;
      ctx.drawImage(
        assets.slimerDeath,
        sx,
        0,
        SPRITES.enemyDeath.frameW,
        SPRITES.enemyDeath.frameH,
        screenX - SPRITES.enemyDeath.drawW / 2,
        pfx.y - SPRITES.enemyDeath.drawH / 2,
        SPRITES.enemyDeath.drawW,
        SPRITES.enemyDeath.drawH
      );
    }
  }
}

function render() {
  drawBackground();

  if (game.player) {
    drawEnemies();
    drawBullets();
    drawParticles();
    drawPlayer(game.player);
  }

  if (game.state === "menu") {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffe08a";
    ctx.font = "38px UranusPixel";
    ctx.fillText("Foxy Survival", canvas.width / 2 - 140, canvas.height / 2 - 20);
    ctx.font = "22px UranusPixel";
    ctx.fillStyle = "#dafce8";
    ctx.fillText("点击右侧开始游戏", canvas.width / 2 - 120, canvas.height / 2 + 20);
  }

  if (game.state === "gameover") {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff7070";
    ctx.font = "44px UranusPixel";
    ctx.fillText("GAME OVER", canvas.width / 2 - 120, canvas.height / 2);
  }
}

function frame(ts) {
  if (!game.lastTime) {
    game.lastTime = ts;
  }
  const dt = Math.min((ts - game.lastTime) / 1000, 0.033);
  game.lastTime = ts;

  update(dt);
  render();
  requestAnimationFrame(frame);
}

async function refreshLeaderboard() {
  leaderboardListEl.innerHTML = "";
  const url = buildApiUrl("/scores/top?limit=10");
  if (!url) {
    const li = document.createElement("li");
    li.textContent = "未配置后端API（可在 config.js 设置）";
    leaderboardListEl.appendChild(li);
    return;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("failed");
    }
    const rows = await res.json();
    if (!rows.length) {
      const li = document.createElement("li");
      li.textContent = "暂无成绩";
      leaderboardListEl.appendChild(li);
      return;
    }
    for (const row of rows) {
      const li = document.createElement("li");
      li.textContent = `${row.player_name} - ${row.score} 分 (${row.survived_seconds}s)`;
      leaderboardListEl.appendChild(li);
    }
  } catch {
    const li = document.createElement("li");
    li.textContent = "后端未连接，显示失败";
    leaderboardListEl.appendChild(li);
  }
}

async function submitScore() {
  if (!game.player) {
    return;
  }
  const name = playerNameEl.value.trim();
  if (!name) {
    submitStatusEl.textContent = "请输入昵称";
    submitStatusEl.className = "err";
    return;
  }

  const url = buildApiUrl("/scores");
  if (!url) {
    submitStatusEl.textContent = "未配置后端API，无法提交";
    submitStatusEl.className = "err";
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_name: name,
        score: game.score,
        survived_seconds: Math.floor(game.elapsed),
      }),
    });
    if (!res.ok) {
      throw new Error("submit failed");
    }
    submitStatusEl.textContent = "提交成功";
    submitStatusEl.className = "ok";
    await refreshLeaderboard();
  } catch {
    submitStatusEl.textContent = "提交失败，请检查后端服务";
    submitStatusEl.className = "err";
  }
}

function bindInputEvents() {
  window.addEventListener("keydown", (e) => {
    game.keys[e.code] = true;
    if (e.code === "Space") {
      shoot();
    }
    if (e.code === "ShiftLeft") {
      startRoll();
    }
  });

  window.addEventListener("keyup", (e) => {
    game.keys[e.code] = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    game.mouse.x = (e.clientX - rect.left) * scaleX + game.cameraX;
    game.mouse.y = (e.clientY - rect.top) * scaleY;
    const uiX = e.clientX - rect.left;
    const uiY = e.clientY - rect.top;
    crosshairEl.style.left = `${uiX}px`;
    crosshairEl.style.top = `${uiY}px`;
    if (game.player) {
      game.player.facingX = game.mouse.x - game.player.x;
      game.player.facingY = game.mouse.y - game.player.y;
    }
  });

  canvas.addEventListener("mouseenter", () => {
    crosshairEl.classList.remove("hidden");
  });

  canvas.addEventListener("mouseleave", () => {
    crosshairEl.classList.add("hidden");
  });

  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      burstShoot();
      return;
    }
    if (e.button === 0) {
      shoot();
    }
  });

  function bindStick(zoneEl, knobEl, onVector, onActive) {
    const maxRadius = 42;
    let pointerId = null;

    const reset = () => {
      pointerId = null;
      knobEl.style.transform = "translate(-50%, -50%)";
      onVector(0, 0);
      onActive(false);
    };

    const update = (e) => {
      const rect = zoneEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
      }
      knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      onVector(dx / maxRadius, dy / maxRadius);
      onActive(true);
    };

    zoneEl.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      pointerId = e.pointerId;
      zoneEl.setPointerCapture(e.pointerId);
      update(e);
    });

    zoneEl.addEventListener("pointermove", (e) => {
      if (pointerId !== e.pointerId) {
        return;
      }
      e.preventDefault();
      update(e);
    });

    zoneEl.addEventListener("pointerup", (e) => {
      if (pointerId !== e.pointerId) {
        return;
      }
      e.preventDefault();
      reset();
    });

    zoneEl.addEventListener("pointercancel", (e) => {
      if (pointerId !== e.pointerId) {
        return;
      }
      e.preventDefault();
      reset();
    });
  }

  bindStick(
    leftStickZoneEl,
    leftStickKnobEl,
    (x, y) => {
      game.touch.moveX = x;
      game.touch.moveY = y;
    },
    () => {}
  );

  bindStick(
    rightStickZoneEl,
    rightStickKnobEl,
    (x, y) => {
      if (x === 0 && y === 0) {
        return;
      }
      game.touch.aimX = x;
      game.touch.aimY = y;
    },
    (active) => {
      game.touch.shooting = active;
    }
  );

  const bindSkillButton = (el, action) => {
    el.addEventListener("touchstart", (e) => {
      e.preventDefault();
      action();
    });
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      action();
    });
  };

  bindSkillButton(rollBtnEl, startRoll);
  bindSkillButton(burstBtnEl, burstShoot);
}

startBtn.addEventListener("click", () => {
  unlockAudio();
  resetGame();
});

restartBtn.addEventListener("click", () => {
  unlockAudio();
  resetGame();
});

submitScoreBtn.addEventListener("click", submitScore);

window.addEventListener("pointerdown", unlockAudio, { once: true });

bindInputEvents();
refreshLeaderboard();
requestAnimationFrame(frame);
