// 作用：实现 demo 前端玩法循环、成绩提交与排行榜展示。
// 使用方法：页面加载后自动初始化，用户点击“开始游戏”进入流程。
// 输入输出：输入为键鼠交互与后端 API 响应，输出为 Canvas 渲染与榜单 UI 更新。
const query = new URLSearchParams(window.location.search);
const queryApi = query.get("api");
const configuredApi = (window.DEMO_GAME_API_BASE || "").trim();
const API_BASE = (queryApi || configuredApi || "/api").replace(/\/$/, "");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const hpEl = document.getElementById("hp");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const waveEl = document.getElementById("wave");
const statusTextEl = document.getElementById("statusText");
const startBtnEl = document.getElementById("startBtn");
const restartBtnEl = document.getElementById("restartBtn");
const submitCardEl = document.getElementById("submitCard");
const finalScoreEl = document.getElementById("finalScore");
const playerNameEl = document.getElementById("playerName");
const submitScoreBtnEl = document.getElementById("submitScoreBtn");
const submitStatusEl = document.getElementById("submitStatus");
const leaderboardListEl = document.getElementById("leaderboardList");

const assets = {
  bg: loadImage("./assets/Sprites/ForestBackground.png"),
  player: loadImage("./assets/Sprites/Foxy.png"),
  enemy: loadImage("./assets/Sprites/Slimer.png"),
  bullet: loadImage("./assets/Sprites/Bullet.png"),
};

const sounds = {
  bgm: loadAudio("./assets/Audio/BGM.ogg", 0.2, true),
  gun: loadAudio("./assets/Audio/Gun.mp3", 0.35, false),
  enemyDeath: loadAudio("./assets/Audio/EnemyDeath.mp3", 0.3, false),
  gameOver: loadAudio("./assets/Audio/GameOver.mp3", 0.4, false),
};

const PLAYER_SPRITES = {
  // 作用：定义狐狸在图集中的待机、移动、死亡三套动画帧。
  // 使用方法：drawPlayer 与 update 通过当前动画状态读取对应帧。
  // 输入输出：输入为动画名，输出为该动画的帧数组。
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
};

const game = {
  state: "menu",
  keys: {},
  mouse: { x: canvas.width / 2, y: canvas.height / 2 },
  player: null,
  enemies: [],
  bullets: [],
  score: 0,
  elapsed: 0,
  wave: 1,
  spawnTimer: 0,
  lastTs: 0,
  audioReady: false,
};

function loadImage(src) {
  // 作用：异步加载图片资源。
  // 使用方法：传入相对路径，返回可直接用于 drawImage 的 Image 对象。
  // 输入输出：输入为资源路径字符串，输出为 HTMLImageElement。
  const img = new Image();
  img.src = src;
  return img;
}

function loadAudio(src, volume, loop) {
  // 作用：创建音频节点并设置基础参数。
  // 使用方法：在 sounds 映射中统一注册并复用。
  // 输入输出：输入为路径、音量、循环标记，输出为 HTMLAudioElement。
  const audio = new Audio(src);
  audio.volume = volume;
  audio.loop = loop;
  return audio;
}

function playSfx(audio) {
  // 作用：播放一次性音效，避免打断已有实例。
  // 使用方法：在开火、击杀、结束等事件中调用。
  // 输入输出：输入为音频对象，输出为非阻塞播放动作。
  if (!game.audioReady) {
    return;
  }
  const node = audio.cloneNode(true);
  node.play().catch(() => {});
}

function buildApiUrl(path) {
  // 作用：统一拼接 API 地址，兼容相对路径与完整 URL。
  // 使用方法：所有 fetch 请求前调用本函数。
  // 输入输出：输入为接口 path，输出为可直接请求的 URL。
  if (!API_BASE) {
    return null;
  }
  if (API_BASE.startsWith("http://") || API_BASE.startsWith("https://")) {
    return `${API_BASE}${path}`;
  }
  return `${API_BASE}${path}`;
}

function clamp(value, min, max) {
  // 作用：将数值限制在区间内，避免对象越界。
  // 使用方法：移动更新时调用。
  // 输入输出：输入为当前值和边界，输出为限制后的数值。
  return Math.max(min, Math.min(max, value));
}

function resetGame() {
  // 作用：初始化一局新游戏的状态。
  // 使用方法：开始按钮与重开按钮触发。
  // 输入输出：无输入；输出为已重置的全局 game 状态。
  game.state = "playing";
  game.player = {
    x: canvas.width / 2,
    y: canvas.height - 120,
    speed: 260,
    hp: 100,
    radius: 18,
    cooldown: 0,
    facingX: 1,
    anim: "idle",
    frame: 0,
    frameTime: 0,
  };
  game.enemies = [];
  game.bullets = [];
  game.score = 0;
  game.elapsed = 0;
  game.wave = 1;
  game.spawnTimer = 0;
  game.lastTs = 0;
  submitCardEl.classList.add("hidden");
  submitStatusEl.textContent = "";
  submitStatusEl.className = "";
  statusTextEl.textContent = "战斗中";

  if (game.audioReady) {
    sounds.bgm.currentTime = 0;
    sounds.bgm.play().catch(() => {});
  }
}

function unlockAudio() {
  // 作用：解锁浏览器自动播放策略，允许后续播放音效。
  // 使用方法：在用户首个交互事件中调用一次。
  // 输入输出：无输入；输出为 audioReady 状态变为 true。
  if (game.audioReady) {
    return;
  }
  game.audioReady = true;
  sounds.bgm.play().then(() => sounds.bgm.pause()).catch(() => {});
}

function spawnEnemy() {
  // 作用：按波次生成追踪型敌人。
  // 使用方法：update 中按计时触发。
  // 输入输出：无输入；输出为向 enemies 数组追加新对象。
  const fromLeft = Math.random() < 0.5;
  const x = fromLeft ? -30 : canvas.width + 30;
  const y = 240 + Math.random() * (canvas.height - 260);
  const hp = Math.random() < 0.2 ? 3 : Math.random() < 0.45 ? 2 : 1;
  game.enemies.push({
    x,
    y,
    hp,
    maxHp: hp,
    radius: 16,
    speed: 70 + Math.random() * 40 + game.wave * 8,
    frame: 0,
    frameTime: 0,
  });
}

function shoot() {
  // 作用：从玩家位置向鼠标方向发射单发子弹。
  // 使用方法：鼠标左键触发，受冷却限制。
  // 输入输出：输入为当前鼠标坐标，输出为 bullets 新子弹对象。
  if (game.state !== "playing" || !game.player || game.player.cooldown > 0) {
    return;
  }

  const dx = game.mouse.x - game.player.x;
  const dy = game.mouse.y - game.player.y;
  const len = Math.hypot(dx, dy) || 1;
  const vx = (dx / len) * 640;
  const vy = (dy / len) * 640;

  game.bullets.push({
    x: game.player.x,
    y: game.player.y,
    vx,
    vy,
    radius: 5,
    life: 1.1,
    damage: 1,
  });
  game.player.cooldown = 0.18;
  playSfx(sounds.gun);
}

function update(dt) {
  // 作用：推进一帧逻辑，包括移动、刷怪、碰撞、结算。
  // 使用方法：requestAnimationFrame 驱动时每帧调用。
  // 输入输出：输入为 dt（秒），输出为更新后的游戏状态。
  if (!game.player) {
    return;
  }

  if (game.state === "gameover") {
    // 作用：死亡后继续推进死亡动画，直到停在最后一帧。
    // 使用方法：游戏结束后每帧调用。
    // 输入输出：输入为帧间隔 dt，输出为死亡动画帧索引变化。
    const deathFrames = PLAYER_SPRITES.death;
    game.player.anim = "death";
    game.player.frameTime += dt;
    if (game.player.frameTime >= 0.16 && game.player.frame < deathFrames.length - 1) {
      game.player.frame += 1;
      game.player.frameTime = 0;
    }
    hpEl.textContent = "0";
    scoreEl.textContent = `${game.score}`;
    timeEl.textContent = `${Math.floor(game.elapsed)}`;
    waveEl.textContent = `${game.wave}`;
    return;
  }

  if (game.state !== "playing") {
    return;
  }

  game.elapsed += dt;
  game.wave = Math.floor(game.elapsed / 20) + 1;
  game.player.cooldown = Math.max(0, game.player.cooldown - dt);

  let mx = 0;
  let my = 0;
  if (game.keys.KeyW) my -= 1;
  if (game.keys.KeyS) my += 1;
  if (game.keys.KeyA) mx -= 1;
  if (game.keys.KeyD) mx += 1;
  const isMoving = mx !== 0 || my !== 0;
  const mLen = Math.hypot(mx, my) || 1;

  game.player.x += (mx / mLen) * game.player.speed * dt;
  game.player.y += (my / mLen) * game.player.speed * dt;
  game.player.x = clamp(game.player.x, 24, canvas.width - 24);
  game.player.y = clamp(game.player.y, 220, canvas.height - 20);

  // 作用：按移动状态切换待机/移动动画，并推进动画帧。
  // 使用方法：每帧在位置计算后执行。
  // 输入输出：输入为当前是否移动与 dt，输出为 anim/frame 的更新。
  const targetAnim = isMoving ? "move" : "idle";
  if (game.player.anim !== targetAnim) {
    game.player.anim = targetAnim;
    game.player.frame = 0;
    game.player.frameTime = 0;
  }
  // 作用：待机与移动动画按全局时间直接取帧，避免计时器漂移导致动画看起来静止。
  // 使用方法：每帧在切换目标动画后执行。
  // 输入输出：输入为当前 elapsed 与动画类型，输出为稳定变化的 frame 索引。
  if (game.player.anim === "move") {
    game.player.frame = Math.floor(game.elapsed * 12) % PLAYER_SPRITES.move.length;
  } else {
    game.player.frame = Math.floor(game.elapsed * 6) % PLAYER_SPRITES.idle.length;
  }

  // 作用：使用鼠标朝向更新角色左右翻转方向。
  // 使用方法：每帧根据鼠标与角色的相对位置计算。
  // 输入输出：输入为鼠标与角色坐标，输出为 facingX（1 或 -1）。
  const lookDx = game.mouse.x - game.player.x;
  if (Math.abs(lookDx) > 1) {
    game.player.facingX = lookDx >= 0 ? 1 : -1;
  }

  const spawnRate = Math.min(3.2, 0.7 + (game.wave - 1) * 0.22);
  game.spawnTimer -= dt;
  while (game.spawnTimer <= 0) {
    spawnEnemy();
    game.spawnTimer += 1 / spawnRate;
  }

  for (const bullet of game.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
  }
  game.bullets = game.bullets.filter(
    (b) => b.life > 0 && b.x > -40 && b.x < canvas.width + 40 && b.y > 180 && b.y < canvas.height + 40
  );

  for (const enemy of game.enemies) {
    const dx = game.player.x - enemy.x;
    const dy = game.player.y - enemy.y;
    const len = Math.hypot(dx, dy) || 1;
    enemy.x += (dx / len) * enemy.speed * dt;
    enemy.y += (dy / len) * enemy.speed * dt;
    enemy.frameTime += dt;
    if (enemy.frameTime >= 0.12) {
      enemy.frame = (enemy.frame + 1) % 8;
      enemy.frameTime = 0;
    }

    if (len < enemy.radius + game.player.radius) {
      game.player.hp -= 18 * dt;
    }
  }

  for (const bullet of game.bullets) {
    for (const enemy of game.enemies) {
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      if (Math.hypot(dx, dy) < bullet.radius + enemy.radius) {
        bullet.life = 0;
        enemy.hp -= bullet.damage;
        if (enemy.hp <= 0) {
          game.score += enemy.maxHp * 10;
          playSfx(sounds.enemyDeath);
        }
      }
    }
  }
  game.enemies = game.enemies.filter((e) => e.hp > 0);

  if (game.player.hp <= 0) {
    game.state = "gameover";
    game.player.anim = "death";
    game.player.frame = 0;
    game.player.frameTime = 0;
    statusTextEl.textContent = "游戏结束";
    finalScoreEl.textContent = `${game.score}`;
    submitCardEl.classList.remove("hidden");
    sounds.bgm.pause();
    playSfx(sounds.gameOver);
  }

  hpEl.textContent = `${Math.max(0, Math.floor(game.player.hp))}`;
  scoreEl.textContent = `${game.score}`;
  timeEl.textContent = `${Math.floor(game.elapsed)}`;
  waveEl.textContent = `${game.wave}`;
}

function drawBackground() {
  // 作用：绘制背景图并在缺图时降级为纯色背景。
  // 使用方法：每帧渲染起始调用。
  // 输入输出：输入为资源状态，输出为 Canvas 背景图层。
  if (assets.bg.complete && assets.bg.naturalWidth > 0) {
    ctx.drawImage(assets.bg, 0, 0, canvas.width, canvas.height);
    return;
  }
  ctx.fillStyle = "#13342c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawPlayer() {
  // 作用：绘制玩家精灵；资源不可用时绘制占位圆。
  // 使用方法：每帧渲染中在背景后调用。
  // 输入输出：输入为 player 位置状态，输出为玩家图像。
  if (!game.player) {
    return;
  }
  if (assets.player.complete) {
    const frames = PLAYER_SPRITES[game.player.anim] || PLAYER_SPRITES.idle;
    const frame = frames[Math.min(game.player.frame, frames.length - 1)];
    ctx.save();
    ctx.translate(game.player.x, game.player.y);
    if (game.player.facingX < 0) {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      assets.player,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      -28,
      -28,
      56,
      56
    );
    ctx.restore();
    return;
  }
  ctx.fillStyle = "#ffb072";
  ctx.beginPath();
  ctx.arc(game.player.x, game.player.y, game.player.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemies() {
  // 作用：绘制敌人精灵与血量提示。
  // 使用方法：每帧渲染中在玩家前后均可调用。
  // 输入输出：输入为 enemies 列表，输出为敌人图像与文本。
  for (const enemy of game.enemies) {
    if (assets.enemy.complete) {
      const sx = (enemy.frame % 8) * 41;
      ctx.drawImage(assets.enemy, sx, 0, 41, 38, enemy.x - 24, enemy.y - 22, 50, 46);
    } else {
      ctx.fillStyle = "#5ee863";
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#ffe3a1";
    ctx.font = "12px UranusPixel";
    ctx.fillText(`${enemy.hp}`, enemy.x - 4, enemy.y - 18);
  }
}

function drawBullets() {
  // 作用：绘制子弹精灵；资源缺失时绘制占位圆点。
  // 使用方法：每帧渲染中调用。
  // 输入输出：输入为 bullets 列表，输出为子弹图像。
  for (const bullet of game.bullets) {
    if (assets.bullet.complete) {
      ctx.drawImage(assets.bullet, bullet.x - 7, bullet.y - 7, 14, 14);
    } else {
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function render() {
  // 作用：统一组织渲染顺序，确保画面正确叠层。
  // 使用方法：在动画帧循环内调用。
  // 输入输出：无输入；输出为完整的一帧画面。
  drawBackground();
  drawEnemies();
  drawBullets();
  drawPlayer();

  if (game.state === "menu") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffe08a";
    ctx.font = "36px UranusPixel";
    ctx.fillText("Foxy Survival Demo", 250, 250);
    ctx.font = "20px UranusPixel";
    ctx.fillStyle = "#dafce8";
    ctx.fillText("点击右侧开始游戏", 350, 290);
  }
}

function loop(ts) {
  // 作用：驱动主循环，按时间差更新逻辑并渲染。
  // 使用方法：通过 requestAnimationFrame 持续调度。
  // 输入输出：输入为浏览器高精度时间戳，输出为下一帧调度。
  if (!game.lastTs) {
    game.lastTs = ts;
  }
  const dt = Math.min((ts - game.lastTs) / 1000, 0.033);
  game.lastTs = ts;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

async function refreshLeaderboard() {
  // 作用：读取后端排行榜并渲染到列表。
  // 使用方法：页面初始化与提交成功后调用。
  // 输入输出：输入为后端接口响应，输出为 leaderboard DOM 项。
  leaderboardListEl.innerHTML = "";
  const url = buildApiUrl("/scores/top?limit=10");
  if (!url) {
    const li = document.createElement("li");
    li.textContent = "未配置后端 API";
    leaderboardListEl.appendChild(li);
    return;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("排行榜请求失败");
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
    li.textContent = "后端未连接，加载失败";
    leaderboardListEl.appendChild(li);
  }
}

async function submitScore() {
  // 作用：提交当前局成绩到后端。
  // 使用方法：游戏结束后点击提交按钮触发。
  // 输入输出：输入为昵称与局内统计，输出为提交结果文案与榜单刷新。
  if (game.state !== "gameover") {
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
    submitStatusEl.textContent = "未配置后端 API，无法提交";
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
      throw new Error("提交失败");
    }

    submitStatusEl.textContent = "提交成功";
    submitStatusEl.className = "ok";
    await refreshLeaderboard();
  } catch {
    submitStatusEl.textContent = "提交失败，请检查后端服务";
    submitStatusEl.className = "err";
  }
}

function bindEvents() {
  // 作用：统一绑定键盘、鼠标与按钮事件。
  // 使用方法：页面初始化时调用一次。
  // 输入输出：输入为用户交互事件，输出为 game 状态变化。
  window.addEventListener("keydown", (e) => {
    game.keys[e.code] = true;
  });

  window.addEventListener("keyup", (e) => {
    game.keys[e.code] = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    game.mouse.x = (e.clientX - rect.left) * scaleX;
    game.mouse.y = (e.clientY - rect.top) * scaleY;
  });

  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      shoot();
    }
  });

  startBtnEl.addEventListener("click", () => {
    unlockAudio();
    resetGame();
  });

  restartBtnEl.addEventListener("click", () => {
    unlockAudio();
    resetGame();
  });

  submitScoreBtnEl.addEventListener("click", submitScore);
  window.addEventListener("pointerdown", unlockAudio, { once: true });
}

// 作用：执行 demo 前端初始化流程。
// 使用方法：脚本加载后自动执行。
// 输入输出：无输入；输出为可交互页面。
bindEvents();
refreshLeaderboard();
requestAnimationFrame(loop);
