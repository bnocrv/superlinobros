import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

import { db } from "./firebase.js"; // Importa Firestore pronto

// ==== DOM
const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const gameCanvas = document.getElementById("gameCanvas");
const scoreDisplay = document.getElementById("score");
const gameOverScreen = document.getElementById("gameOverScreen");
const restartButton = document.getElementById("restartButton");
const finalScoreSpan = document.getElementById("finalScore");
const highScoresDiv = document.getElementById("highScores");

const canvas = gameCanvas;
const ctx = canvas.getContext("2d");

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


// ==== SONS
const soundTheme = new Audio("audio/theme.wav");
soundTheme.loop = true;
soundTheme.volume = 0.1;
const soundJump = new Audio("audio/jump.ogg");
const soundDie = new Audio("audio/die.ogg");
const soundPowerup = new Audio("audio/powerup.ogg");

// ==== ESTADO JOGADOR
const player = {
  x: 100,
  y: GROUND_Y - 92,
  width: 66,
  height: 92,
  vy: 0,
  jumping: false,
  rolling: false,
  rollFrame: 0,
  rollFrameDelay: 7,  // Tempo da rolagem
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
let gameOver = false;
let gameSpeed = 4;
let chaoOffset = 0;
let obstacles = [];
let coins = [];
let obstacleTimer = 0;
let coinTimer = 0;
let powerupTimer = 0;
let blinkTimer = 0;
let canRoll = true; // <- permite uma rolagem por pressionamento
let touchStartY = 0; // <- touch
let touchEndY = 0; // <- touch


const powerupDuration = 5000;
const blinkInterval = 200;

let highScores = [];

let explosion = {
  active: false,
  frame: 0,
  x: 0,
  y: 0,
  frameDelay: 5,
  frameTimer: 0
};


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
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return m;
    }
  });
}

// ==== FUNÇÕES DO JOGO

function spawnObstacle() {
  const tipo = Math.random();

  if (tipo < 0.4) {
    obstacles.push({ x: canvas.width, y: GROUND_Y - 31, width: 54, height: 31, image: obstaculoChaoImg });
 } else if (tipo < 0.7) {
  const height = 31;
  const minY = GROUND_Y - 180; // topo
  const maxY = GROUND_Y - 75;  // mais baixo, exige rolar
  const y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;

  obstacles.push({
    x: canvas.width,
    y,
    width: 54,
    height,
    image: obstaculoVoadorImg
  });
}
 else {
    obstacles.push({ x: canvas.width, y: GROUND_Y - 80, width: 54, height: 80, image: obstaculoPosteImg });
  }
}

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
  const coinWidth = 70;
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
  const currentGravity = (player.jumping && player.fastFall) ? FAST_FALL_GRAVITY : GRAVITY;
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
    // 👉 Ativa a explosão na posição do jogador
    explosion.active = true;
    explosion.frame = 0;
    explosion.frameTimer = 0;
    explosion.x = player.x;
    explosion.y = player.y;

    endGame();
  }
}


  coins.forEach((coin, i) => {
    if (checkCollision(player, coin)) {
      score++;
      scoreDisplay.innerText = `🪙 ${score}`;
      coins.splice(i, 1);

      if (score % 10 === 0) gameSpeed += 0.5;
      if (score % 30 === 0) activatePowerup();
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
      soundTheme.playbackRate = 1;
    }
  }

  obstacleTimer += deltaTime;
  coinTimer += deltaTime;

  if (obstacleTimer > 1500) {
    spawnObstacle();
    obstacleTimer = 0;
  }

  if (coinTimer > 1200) {
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
      ctx.drawImage(jumpSprite, player.x, player.y, player.width, player.height);
    } else if (player.rolling) {
      const rollImage = rollFrames[player.rollFrame];
      ctx.drawImage(rollImage, player.x, player.y + 20, player.width, player.height * 0.7);
    } else {
      ctx.drawImage(runFrames[player.frame], player.x, player.y, player.width, player.height);
    }
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
    soundJump.play();
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
      offsetY: 40,  // mais próximo do chão
      width: 45,
      height: 35,   // menor altura
    };
  }
}

function activatePowerup() {
  player.invincible = true;
  powerupTimer = 0;
  blinkTimer = 0;
  soundPowerup.play();
  soundTheme.playbackRate = 1.5;
}

async function endGame() {
  gameOver = true;
  soundDie.play();
  soundTheme.pause();
  finalScoreSpan.innerText = score;
  gameOverScreen.classList.remove("hidden");

  await fetchHighScores();

  const lowestScore = highScores.length < 5 ? 0 : highScores[highScores.length - 1].score;
  if (score > lowestScore || highScores.length < 5) {
    let playerName = prompt("Parabéns! Você entrou no Top 5! Digite seu nome:", "Lino");
    if (!playerName) playerName = "Anônimo";
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
  explosion.active = false;
explosion.frame = 0;
explosion.frameTimer = 0;

  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  gameCanvas.classList.remove("hidden");
  scoreDisplay.innerText = "🪙 0";
  score = 0;
  gameSpeed = 4;
  obstacles = [];
  coins = [];
  player.y = GROUND_Y - player.height;
  player.vy = 0;
  player.jumping = false;
  player.rolling = false;
  player.invincible = false;
  player.visible = true;
  gameOver = false;
  soundTheme.currentTime = 0;
  soundTheme.play();
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

  if ((e.code === "Enter" || e.code === "Space") && gameOver) startGame();
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
