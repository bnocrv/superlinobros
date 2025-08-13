import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

import { db } from "./firebase.js"; // Importa Firestore pronto

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .then(() => console.log("✅ Service Worker registrado!"))
    .catch((error) => console.error("❌ Erro ao registrar SW:", error));
}

// ==== DOM
const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const toggleSoundButton = document.getElementById("toggleSound");
const gameCanvas = document.getElementById("gameCanvas");
const scoreDisplay = document.getElementById("score");
const gameOverScreen = document.getElementById("gameOverScreen");
const restartButton = document.getElementById("restartButton");
const finalScoreSpan = document.getElementById("finalScore");
const highScoresDiv = document.getElementById("highScores");

const canvas = gameCanvas;
const ctx = canvas.getContext("2d");
const isMobile = window.innerWidth < 768;

// ==== CONSTANTES
const GRAVITY = 0.6;
const FAST_FALL_GRAVITY = 1.5;
const JUMP_FORCE = -14;
const GROUND_Y = canvas.height - 70;

// ==== IMAGENS
const runFrames = [];
for (let i = 1; i <= 6; i++) {
  const img = new Image();
  img.src = `img/corpo_run${i}.png`;
  runFrames.push(img);
}
const jumpSprite = new Image();
jumpSprite.src = "img/corpo_jump.png";

const rollFrames = []; // NOVO
for (let i = 1; i <= 4; i++) {
  const img = new Image();
  img.src = `img/corpo_down${i}.png`;
  rollFrames.push(img);
}

const rosto = new Image();
rosto.src = "img/rosto.png";
const chao = new Image();
chao.src = "img/chao.png";
const fundo = new Image();
fundo.src = "img/fundo.png";
const moedaImg = new Image();
moedaImg.src = "img/moeda.png";
const obstaculoChaoImg = new Image();
obstaculoChaoImg.src = "img/obstaculo.png";
const obstaculoVoadorImg = new Image();
obstaculoVoadorImg.src = "img/obstaculo_voador.png";
const obstaculoPosteImg = new Image();
obstaculoPosteImg.src = "img/obstaculo_poste.png";

const explosionFrames = [];
for (let i = 1; i <= 5; i++) {
  const img = new Image();
  img.src = `img/flash0${i}.png`;
  explosionFrames.push(img);
}

// ==== BOSS SPRITES (NOVO)
const bossFrames = [];
for (let i = 1; i <= 3; i++) {
  const img = new Image();
  img.src = `img/boss${i}.png`; // boss1.png, boss2.png, boss3.png
  bossFrames.push(img);
}

// mantenho a imagem antiga apenas como fallback (não usada para animação)
const bossStaticImg = new Image();
bossStaticImg.src = "img/boss.png";

// ==== SONS
const soundTheme = new Audio("audio/theme.wav");
let soundEnabled = true;
soundTheme.loop = true;
soundTheme.volume = 0.1;
const soundJump = new Audio("audio/jump.ogg");
const soundDie = new Audio("audio/die.ogg");
const soundPowerup = new Audio("audio/powerup.ogg");
const soundCoin = new Audio("audio/coin.ogg");
soundCoin.volume = 0.01; // ajuste se quiser mais alto/baixo
toggleSoundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;

  if (soundEnabled) {
    soundTheme.volume = 0.1;
    toggleSoundButton.innerText = "🔊 Som";
  } else {
    soundTheme.volume = 0;
    toggleSoundButton.innerText = "🔇 Mudo";
  }
});

// ==== ESTADO JOGADOR
const player = {
  x: 100,
  y: GROUND_Y - 92,
  width: 120,
  height: 92,
  vy: 0,
  jumping: false,
  rolling: false,
  rollFrame: 0,
  rollFrameDelay: 7, // Tempo da rolagem
  rollFrameTimer: 2,
  frame: 0,
  frameDelay: 5,
  // Hitbox atual usada para colisões
  hitbox: { offsetX: 10, offsetY: 15, width: 45, height: 70 },
  // Hitbox original (em pé), usada para restaurar depois da rolagem
  originalHitbox: { offsetX: 10, offsetY: 15, width: 45, height: 70 },
  invincible: false,
  visible: true,
};

// ==== VARIÁVEIS DO JOGO
let score = 0;
let powerupEligibleCoins = 0; // Contador de moedas que valem para ativar powerup
let gameOver = false;
let lives = 3;
const livesDisplay = document.getElementById("lives");
let gameSpeed = 4;
let chaoOffset = 0;
let obstacles = [];
let coins = [];
let obstacleTimer = 0;
let coinTimer = 0;
let powerupTimer = 0;
let coinRainActive = false; // controla a chuva de moedas
let blinkTimer = 0;
let canRoll = true; // <- permite uma rolagem por pressionamento
let touchStartY = 0; // <- touch
let touchEndY = 0; // <- touch

const powerupDuration = 2000;
const blinkInterval = 200;

let highScores = [];

let explosion = {
  active: false,
  frame: 0,
  x: 0,
  y: 0,
  frameDelay: 5,
  frameTimer: 0,
};

function updateLivesDisplay() {
  livesDisplay.innerText = `❤️ x${lives}`;
}

// ==== BOSS ====
const boss = {
  x: canvas.width,
  y: GROUND_Y - 120,
  width: 120,
  height: 120,
  vx: 0,
  state: "idle",
  active: false,
  attackTimer: 0,
  attackInterval: 1000,
  attackCount: 0,
  maxAttacks: 3,
  cooldownTimer: 0,
  // ANIMAÇÃO DO CHEFE (NOVO)
  frame: 0,
  frameDelay: 10,
  frameTimer: 0,
  // image: fallback se precisar
  image: bossStaticImg,
};
// OBS: REMOVIDO bossWeapons e spawnBossWeapon (poder de jogar item) conforme pedido

// ==== FUNÇÕES FIRESTORE
async function fetchHighScores() {
  try {
    const scoresRef = collection(db, "highscores");
    const q = query(scoresRef, orderBy("score", "desc"), limit(5));
    const snapshot = await getDocs(q);

    highScores = [];
    snapshot.forEach((doc) => {
      highScores.push(doc.data());
    });

    displayHighScores();
  } catch (err) {
    console.error("Erro ao buscar highscores:", err);
  }
}

async function addHighScore(name, score) {
  try {
    const scoresRef = collection(db, "highscores");
    await addDoc(scoresRef, { name, score });
  } catch (err) {
    console.error("Erro ao adicionar highscore:", err);
  }
}

function displayHighScores() {
  if (!highScoresDiv) return;

  if (highScores.length === 0) {
    highScoresDiv.innerHTML = "<p>Nenhuma pontuação ainda.</p>";
    return;
  }

  highScoresDiv.innerHTML = `
    <h3>🏆 Top 5 Pontuações:</h3>
    <ol>
      ${highScores
        .map((p) => `<li>${escapeHTML(p.name)}: ${p.score} 🪙</li>`)
        .join("")}
    </ol>
  `;
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return m;
    }
  });
}

// ==== FUNÇÕES DO JOGO

function spawnObstacle() {
  const tipo = Math.random();

  if (tipo < 0.4) {
    obstacles.push({
      x: canvas.width,
      y: GROUND_Y - 31,
      width: 54,
      height: 31,
      image: obstaculoChaoImg,
    });
  } else if (tipo < 0.7) {
    const height = 31;
    const minY = GROUND_Y - 180; // topo
    const maxY = GROUND_Y - 75; // mais baixo, exige rolar
    const y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;

    obstacles.push({
      x: canvas.width,
      y,
      width: 54,
      height,
      image: obstaculoVoadorImg,
    });
  } else {
    obstacles.push({
      x: canvas.width,
      y: GROUND_Y - 80,
      width: 54,
      height: 80,
      image: obstaculoPosteImg,
    });
  }
}

function spawnBoss() {
  boss.active = true;
  boss.state = "idle";
  boss.x = canvas.width;
  boss.y = GROUND_Y - boss.height;
  boss.vx = 0;
  boss.attackTimer = 0;
  boss.attackCount = 0;
  boss.cooldownTimer = 0;
  boss.frame = 0;
  boss.frameTimer = 0;
  boss.hitPlayer = false; // ✅ ADICIONA ISSO
  soundTheme.playbackRate = 1.5;
}

// REMOVIDA a função spawnBossWeapon() e todo o sistema bossWeapons (poder de jogar item)

// função de checar se moeda muito próxima de obstáculo
function isCoinTooCloseToObstacle(x, y, width, height) {
  const minDistX = 80;
  for (const o of obstacles) {
    const distX = Math.abs(x - o.x);
    const verticalOverlap = !(y + height < o.y || y > o.y + o.height);
    if (distX < minDistX && verticalOverlap) return true;
  }
  return false;
}

function spawnCoin() {
  const minY = GROUND_Y - 180;
  const maxY = GROUND_Y - 100;
  const coinWidth = 100;
  const coinHeight = 70;
  let y = Math.random() * (maxY - minY) + minY;
  let x = canvas.width;

  let tries = 0;
  while (isCoinTooCloseToObstacle(x, y, coinWidth, coinHeight) && tries < 20) {
    y = Math.random() * (maxY - minY) + minY;
    tries++;
  }

  coins.push({ x, y, width: coinWidth, height: coinHeight });
}

function update(deltaTime) {
  if (gameOver) return;

  if (explosion.active) {
    explosion.frameTimer++;
    if (explosion.frameTimer >= explosion.frameDelay) {
      explosion.frame++;
      explosion.frameTimer = 0;

      if (explosion.frame >= explosionFrames.length) {
        explosion.active = false;
      }
    }
  }

  // Aplicar gravidade
  const currentGravity =
    player.jumping && player.fastFall ? FAST_FALL_GRAVITY : GRAVITY;
  player.vy += currentGravity;
  player.y += player.vy;

  if (player.y >= GROUND_Y - player.height) {
    player.y = GROUND_Y - player.height;
    player.vy = 0;
    player.jumping = false;
    player.fastFall = false;

    if (player.rolling) {
      player.rollFrameTimer++;
      if (player.rollFrameTimer >= player.rollFrameDelay) {
        player.rollFrame++;
        if (player.rollFrame >= rollFrames.length) {
          player.rolling = false;
          player.rollFrame = 0;

          // 🔁 Restaurar hitbox original
          player.hitbox = { ...player.originalHitbox };
        }
        player.rollFrameTimer = 0;
      }
    }
  }

  if (!player.jumping && !player.rolling) {
    player.frameDelay--;
    if (player.frameDelay <= 0) {
      player.frame = (player.frame + 1) % runFrames.length;
      player.frameDelay = 5;
    }
  }

  obstacles.forEach((o) => (o.x -= gameSpeed));
  coins.forEach((c) => (c.x -= gameSpeed));

  obstacles = obstacles.filter((o) => o.x + o.width > 0);
  coins = coins.filter((c) => c.x + c.width > 0);

  for (let o of obstacles) {
    if (!player.invincible && checkCollision(player, o)) {
      explosion.active = true;
      explosion.frame = 0;
      explosion.frameTimer = 0;
      explosion.x = player.x;
      explosion.y = player.y;

      lives--;
      updateLivesDisplay();

      if (lives <= 0) {
        endGame();
      } else {
        player.invincible = true;
        powerupTimer = 0;
        blinkTimer = 0;
        if (soundEnabled) soundDie.play();
      }

      break; // impede múltiplas colisões ao mesmo tempo
    }
  }

  coins.forEach((coin, i) => {
    if (checkCollision(player, coin)) {
      score++;
      scoreDisplay.innerText = `🪙 ${score}`;
      coins.splice(i, 1);

      if (soundEnabled) soundCoin.cloneNode().play();

      // Apenas moedas fora da chuva contam para o powerup
      if (!coinRainActive) {
        powerupEligibleCoins++;

        if (powerupEligibleCoins % 10 === 0) gameSpeed += 0.5;

        if (powerupEligibleCoins % 30 === 0) {
          activatePowerup();
        }
      }
    }
  });

  if (player.invincible) {
    powerupTimer += deltaTime;
    blinkTimer += deltaTime;

    if (blinkTimer > blinkInterval) {
      player.visible = !player.visible;
      blinkTimer = 0;
    }

    if (powerupTimer > powerupDuration) {
      player.invincible = false;
      player.visible = true;
      powerupTimer = 0;
      coinRainActive = false; // 🌧️ desativa a chuva de moedas
      soundTheme.playbackRate = 1;
    }
  }

  // === CHEFÃO ===
  if (score % 100 === 0 && score !== 0 && !boss.active) {
    spawnBoss();
  }

  if (boss.active) {
    switch (boss.state) {
      case "idle":
        boss.attackTimer += deltaTime;
        if (boss.attackTimer > 2000) {
          boss.attackTimer = 0;
          boss.state = "attacking";
        }
        break;

      case "attacking":
        boss.attackTimer += deltaTime;
        if (boss.attackTimer > boss.attackInterval) {
          boss.attackTimer = 0;
          boss.attackCount++;
          // **REMOVED**: spawnBossWeapon() call removed (chefe não joga mais itens)
          if (boss.attackCount >= boss.maxAttacks) {
            boss.state = "running";
            boss.vx = -6;
          }
        }
        break;
      case "running":
        boss.x += boss.vx;

        if (
          !boss.hitPlayer &&
          !player.invincible &&
          checkCollision(player, boss)
        ) {
          const playerBottom = player.y + player.height;
          const bossTop = boss.y;

          // Verifica se a colisão veio de cima
          if (playerBottom <= bossTop + 20 && player.vy > 0) {
            // ✅ Jogador pulou em cima do boss
            boss.active = false;
            boss.hitPlayer = true;
            soundTheme.playbackRate = 1;
            score += 5; // ou o que quiser
            player.vy = JUMP_FORCE / 2; // rebote pra cima
          } else {
            // ❌ Colisão normal — perde vida
            lives--;
            updateLivesDisplay();

            if (lives <= 0) {
              endGame();
            } else {
              player.invincible = true;
              powerupTimer = 0;
              blinkTimer = 0;
              if (soundEnabled) soundDie.play();
            }

            boss.hitPlayer = true;
          }
        }
    }

    // **OBS:** Não há mais armas do boss para mover/checar colisão — isso foi removido conforme pedido
  }

  obstacleTimer += deltaTime;
  coinTimer += deltaTime;

  if (obstacleTimer > 1500) {
    spawnObstacle();
    obstacleTimer = 0;
  }

  coinTimer += deltaTime;

  const coinSpawnInterval = coinRainActive ? 150 : 1200; // 🌧️ mais moedas durante chuva

  if (coinTimer > coinSpawnInterval) {
    spawnCoin();
    coinTimer = 0;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(fundo, 0, 0, canvas.width, canvas.height);

  chaoOffset -= gameSpeed;
  if (chaoOffset <= -canvas.width) chaoOffset = 0;
  ctx.drawImage(chao, chaoOffset, GROUND_Y, canvas.width, 70);
  ctx.drawImage(chao, chaoOffset + canvas.width, GROUND_Y, canvas.width, 70);

  coins.forEach((c) => ctx.drawImage(moedaImg, c.x, c.y, c.width, c.height));
  obstacles.forEach((o) => ctx.drawImage(o.image, o.x, o.y, o.width, o.height));

  if (player.visible) {
    if (player.jumping) {
      if (isMobile) {
        const aspectRatio = jumpSprite.width / jumpSprite.height;
        const desiredHeight = player.height;
        const desiredWidth = desiredHeight * aspectRatio;
        ctx.drawImage(
          jumpSprite,
          player.x,
          player.y,
          desiredWidth,
          desiredHeight
        );
      } else {
        ctx.drawImage(
          jumpSprite,
          player.x,
          player.y,
          player.width,
          player.height
        );
      }
    } else if (player.rolling) {
      const rollImage = rollFrames[player.rollFrame];
      if (isMobile) {
        const aspectRatio = rollImage.width / rollImage.height;
        const desiredHeight = player.height * 0.7;
        const desiredWidth = desiredHeight * aspectRatio;
        ctx.drawImage(
          rollImage,
          player.x,
          player.y + 20,
          desiredWidth,
          desiredHeight
        );
      } else {
        ctx.drawImage(
          rollImage,
          player.x,
          player.y + 20,
          player.width,
          player.height * 0.7
        );
      }
    } else {
      const runImage = runFrames[player.frame];
      if (isMobile) {
        const aspectRatio = runImage.width / runImage.height;
        const desiredHeight = player.height;
        const desiredWidth = desiredHeight * aspectRatio;
        ctx.drawImage(
          runImage,
          player.x,
          player.y,
          desiredWidth,
          desiredHeight
        );
      } else {
        ctx.drawImage(
          runImage,
          player.x,
          player.y,
          player.width,
          player.height
        );
      }
    }
  }

  // **REMOVED**: desenho de armas do chefão (não existem mais)

  // Chefão (com animação de sprites)
  if (boss.active) {
    // atualizar frame de animação do boss
    boss.frameTimer++;
    if (boss.frameTimer >= boss.frameDelay) {
      boss.frame = (boss.frame + 1) % bossFrames.length;
      boss.frameTimer = 0;
    }
    const bossImg = bossFrames[boss.frame] || boss.image;
    ctx.drawImage(bossImg, boss.x, boss.y, boss.width, boss.height);
  }

  if (explosion.active) {
    const frameImg = explosionFrames[explosion.frame];
    if (frameImg) {
      ctx.drawImage(frameImg, explosion.x - 20, explosion.y - 20, 100, 100);
    }
  }

  ctx.drawImage(rosto, 10, 10, 40, 40);
}

function checkCollision(a, b) {
  const aX = a.x + a.hitbox.offsetX;
  const aY = a.y + a.hitbox.offsetY;
  const aW = a.hitbox.width;
  const aH = a.hitbox.height;

  const bX = b.x;
  const bY = b.y;
  const bW = b.width;
  const bH = b.height;

  return aX < bX + bW && aX + aW > bX && aY < bY + bH && aY + aH > bY;
}

function jump() {
  if (!player.jumping && !player.rolling) {
    player.vy = JUMP_FORCE;
    player.jumping = true;
    if (soundEnabled) soundJump.play();
  }
}

function roll() {
  if (!player.jumping && !player.rolling) {
    player.rolling = true;
    player.rollFrame = 0;
    player.rollFrameTimer = 0;

    // Reduzir hitbox ao rolar
    player.hitbox = {
      offsetX: 10,
      offsetY: 40, // mais próximo do chão
      width: 45,
      height: 35, // menor altura
    };
  }
}

function activatePowerup() {
  player.invincible = true;
  powerupTimer = 0;
  blinkTimer = 0;
  coinRainActive = true; // 🌧️ ativa a chuva de moedas
  if (soundEnabled) soundPowerup.play();
  soundTheme.playbackRate = 1.5;
}

async function endGame() {
  gameOver = true;
  if (soundEnabled) soundDie.play();
  soundTheme.pause();
  finalScoreSpan.innerText = score;
  gameOverScreen.classList.remove("hidden");

  await fetchHighScores();

  const lowestScore =
    highScores.length < 5 ? 0 : highScores[highScores.length - 1].score;
  if (score > lowestScore || highScores.length < 5) {
    let playerName = prompt(
      "Parabéns! Você entrou no Top 5! Digite seu nome:",
      "Lino"
    );

    if (!playerName) {
      playerName = "Anônimo";
    } else {
      playerName = playerName
        .replace(/[^a-zA-Z0-9À-ÿçÇ ]/g, "") // permite letras com acento, números e espaço
        .trim()
        .substring(0, 12); // máximo de 12 caracteres
    }

    await addHighScore(playerName, score);
  }

  await fetchHighScores();
}

let lastTime = 0;
function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  update(deltaTime);
  draw();
  if (!gameOver) requestAnimationFrame(gameLoop);
}

function startGame() {
  // Resetar explosão
  explosion.active = false;
  explosion.frame = 0;
  explosion.frameTimer = 0;

  // Esconder telas de início e fim, mostrar canvas
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  gameCanvas.classList.remove("hidden");

  // Resetar pontuação e atualizar display
  score = 0;
  lives = 3;
  updateLivesDisplay();
  scoreDisplay.innerText = "🪙 0";
  powerupEligibleCoins = 0;

  // Resetar velocidade do jogo
  gameSpeed = 4;

  // Limpar arrays de obstáculos e moedas
  obstacles = [];
  coins = [];

  // Resetar estado do jogador
  player.y = GROUND_Y - player.height;
  player.vy = 0;
  player.jumping = false;
  player.rolling = false;
  player.invincible = false;
  player.visible = true;
  player.fastFall = false;

  // Restaurar hitbox para estado original (em pé)
  player.hitbox = { ...player.originalHitbox };

  // Permitir rolar novamente
  canRoll = true;

  // Resetar estado de fim de jogo
  gameOver = false;

  // Resetar estado do chefe
  boss.active = false;
  boss.state = "idle";
  boss.x = canvas.width;
  boss.y = GROUND_Y - boss.height;
  boss.vx = 0;
  boss.attackTimer = 0;
  boss.attackCount = 0;
  boss.cooldownTimer = 0;
  // reset animation
  boss.frame = 0;
  boss.frameTimer = 0;

  // Resetar offset do chão para evitar "pulo" visual
  chaoOffset = 0;

  // Reiniciar música tema do jogo
  soundTheme.currentTime = 0;
  soundTheme.playbackRate = 1;
  soundTheme.play();

  // Iniciar loop do jogo
  lastTime = 0; // garantir que o deltaTime comece zerado
  requestAnimationFrame(gameLoop);
}

// ==== EVENTOS
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

window.addEventListener("keydown", (e) => {
  if ((e.code === "Space" || e.code === "ArrowUp") && !gameOver) jump();
  if (e.code === "ArrowDown" && !gameOver) {
    if (player.jumping) {
      player.fastFall = true;
    } else if (canRoll) {
      roll();
      canRoll = false; // bloqueia até soltar a tecla
    }
  }

  if (
    (e.code === "Enter" || e.code === "Space") &&
    (gameOver || !startScreen.classList.contains("hidden"))
  ) {
    startGame();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowDown") {
    player.fastFall = false;
    canRoll = true; // permite nova rolagem depois de soltar
  }
});

window.addEventListener("touchstart", (e) => {
  touchStartY = e.touches[0].clientY;
});

window.addEventListener("touchend", (e) => {
  touchEndY = e.changedTouches[0].clientY;
  const swipeDistance = touchStartY - touchEndY;

  if (Math.abs(swipeDistance) < 30 || gameOver) return; // evita toques leves

  if (swipeDistance > 0) {
    // Swipe para cima
    jump();
  } else {
    // Swipe para baixo
    if (player.jumping) {
      player.fastFall = true;
    } else if (canRoll) {
      roll();
      canRoll = false;
    }
  }

  // Permite nova rolagem depois do toque
  setTimeout(() => {
    canRoll = true;
  }, 300); // pequeno delay para evitar spam
});

document.getElementById("btn-jump").addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    if (!gameOver) jump();
  },
  { passive: false }
);

document.getElementById("btn-roll").addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    if (!gameOver) {
      if (player.jumping) {
        player.fastFall = true;
      } else if (canRoll) {
        roll();
        canRoll = false;
        setTimeout(() => {
          canRoll = true;
        }, 300);
      }
    }
  },
  { passive: false }
);
