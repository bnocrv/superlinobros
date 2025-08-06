// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Firebase config (use seu próprio config aqui)
const firebaseConfig = {
  apiKey: "AIzaSyDtTJI8yOlIMxR_EYC-2JpoBUlwStgaORA",
  authDomain: "lino-s-world.firebaseapp.com",
  projectId: "lino-s-world",
  storageBucket: "lino-s-world.firebasestorage.app",
  messagingSenderId: "65753250894",
  appId: "1:65753250894:web:dc50fc9592c8bc59a2d71f",
  measurementId: "G-LTY6NZBNR7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ====== JOGO =======
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const GROUND_Y = canvas.height - 70;

// Animações
const runFrames = [];
for (let i = 1; i <= 6; i++) {
  const img = new Image();
  img.src = `img/corpo_run${i}.png`;
  runFrames.push(img);
}

const jumpSprite = new Image();
jumpSprite.src = "img/corpo_jump.png";

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

// Sons
const soundTheme = new Audio("audio/theme.wav");
soundTheme.loop = true;
soundTheme.volume = 0.1;

const soundJump = new Audio("audio/jump.ogg");
const soundDie = new Audio("audio/die.ogg");
const soundPowerup = new Audio("audio/powerup.ogg");

// Jogador
const player = {
  x: 100,
  y: GROUND_Y - 92,
  width: 66,
  height: 92,
  vy: 0,
  jumping: false,
  frame: 0,
  frameDelay: 5,
  hitbox: {
    offsetX: 10,
    offsetY: 15,
    width: 45,
    height: 70,
  },
  invincible: false,
  visible: true,
};

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

const powerupDuration = 5000;
const blinkInterval = 200;

// High Scores: Array carregado do Firebase
let highScores = [];

// ====== FUNÇÕES FIRESTORE ======

async function fetchHighScores() {
  const scoresRef = collection(db, "highscores");
  const q = query(scoresRef, orderBy("score", "desc"), limit(5));
  const querySnapshot = await getDocs(q);

  highScores = [];
  querySnapshot.forEach((doc) => {
    highScores.push(doc.data());
  });

  displayHighScores();
}

async function addHighScore(name, score) {
  const scoresRef = collection(db, "highscores");
  await addDoc(scoresRef, { name, score });
}

// Exibe ranking no HTML
function displayHighScores() {
  const highScoresDiv = document.getElementById("highScores");
  if (!highScoresDiv) return;

  if (highScores.length === 0) {
    highScoresDiv.innerHTML = `
      <h3>🏆 Top 5 Pontuações:</h3>
      <p>Nenhuma pontuação ainda.</p>
    `;
    return;
  }

  highScoresDiv.innerHTML = `
    <h3>🏆 Top 5 Pontuações:</h3>
    <ol>
      ${highScores
        .map(
          (p) =>
            `<li>${escapeHTML(p.name)}: ${p.score} 🪙</li>`
        )
        .join("")}
    </ol>
  `;
}

// Segurança simples para evitar XSS
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

// Obstáculos
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
    obstacles.push({
      x: canvas.width,
      y: GROUND_Y - 130,
      width: 54,
      height: 31,
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

// Moedas
function isCoinTooCloseToObstacle(x, y, width, height) {
  const minDistX = 80;

  for (const o of obstacles) {
    const distX = Math.abs(x - o.x);
    const verticalOverlap = !(y + height < o.y || y > o.y + o.height);
    const horizontalTooClose = distX < minDistX;

    if (horizontalTooClose && verticalOverlap) return true;
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

// Atualização do jogo
function update(deltaTime) {
  if (gameOver) return;

  player.vy += GRAVITY;
  player.y += player.vy;

  if (player.y >= GROUND_Y - player.height) {
    player.y = GROUND_Y - player.height;
    player.vy = 0;
    player.jumping = false;
  }

  if (!player.jumping) {
    player.frameDelay--;
    if (player.frameDelay <= 0) {
      player.frame = (player.frame + 1) % runFrames.length;
      player.frameDelay = 5;
    }
  } else {
    player.frame = 0;
  }

  obstacles.forEach((o) => (o.x -= gameSpeed));
  coins.forEach((c) => (c.x -= gameSpeed));

  obstacles = obstacles.filter((o) => o.x + o.width > 0);
  coins = coins.filter((c) => c.x + c.width > 0);

  for (let o of obstacles) {
    if (!player.invincible && checkCollision(player, o)) {
      endGame();
    }
  }

  coins.forEach((coin, i) => {
    if (checkCollision(player, coin)) {
      score++;
      document.getElementById("score").innerText = `🪙 ${score}`;
      coins.splice(i, 1);

      if (score % 10 === 0) {
        gameSpeed += 0.5;
      }

      if (score % 30 === 0) {
        activatePowerup();
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

// Desenho
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fundo
  ctx.drawImage(fundo, 0, 0, canvas.width, canvas.height);

  // Chão (scroll)
  chaoOffset -= gameSpeed;
  if (chaoOffset <= -canvas.width) chaoOffset = 0;
  ctx.drawImage(chao, chaoOffset, GROUND_Y, canvas.width, 70);
  ctx.drawImage(chao, chaoOffset + canvas.width, GROUND_Y, canvas.width, 70);

  // Moedas
  coins.forEach((c) => {
    ctx.drawImage(moedaImg, c.x, c.y, c.width, c.height);
  });

  // Obstáculos
  obstacles.forEach((o) => {
    ctx.drawImage(o.image, o.x, o.y, o.width, o.height);
  });

  // Jogador
  if (player.visible) {
    if (player.jumping) {
      ctx.drawImage(jumpSprite, player.x, player.y, player.width, player.height);
    } else {
      ctx.drawImage(runFrames[player.frame], player.x, player.y, player.width, player.height);
    }
  }

  // Rosto
  ctx.drawImage(rosto, 10, 10, 40, 40);
}

// Verifica colisão
function checkCollision(a, b) {
  const aX = a.x + a.hitbox.offsetX;
  const aY = a.y + a.hitbox.offsetY;
  const aW = a.hitbox.width;
  const aH = a.hitbox.height;

  const bX = b.x;
  const bY = b.y;
  const bW = b.width;
  const bH = b.height;

  return (
    aX < bX + bW &&
    aX + aW > bX &&
    aY < bY + bH &&
    aY + aH > bY
  );
}

// Pulo
function jump() {
  if (!player.jumping) {
    player.vy = JUMP_FORCE;
    player.jumping = true;
    soundJump.play();
  }
}

// Powerup invencível
function activatePowerup() {
  player.invincible = true;
  powerupTimer = 0;
  blinkTimer = 0;
  soundPowerup.play();
  soundTheme.playbackRate = 1.5;
}

// Finaliza o jogo
async function endGame() {
  gameOver = true;
  soundDie.play();
  soundTheme.pause();

  document.getElementById("finalScore").innerText = score;
  document.getElementById("gameOverScreen").classList.remove("hidden");

  // Pergunta o nome do jogador para salvar o score
  let playerName = prompt("Fim de jogo! Digite seu nome para salvar sua pontuação:", "Lino");
  if (!playerName) playerName = "Anônimo";

  await addHighScore(playerName, score);

  // Atualiza ranking na tela
  await fetchHighScores();
}

// Reinicia o jogo
function restartGame() {
  score = 0;
  gameSpeed = 4;
  obstacles = [];
  coins = [];
  gameOver = false;
  player.y = GROUND_Y - player.height;
  player.vy = 0;
  player.jumping = false;
  player.invincible = false;
  player.visible = true;

  document.getElementById("score").innerText = `🪙 ${score}`;
  document.getElementById("gameOverScreen").classList.add("hidden");

  soundTheme.currentTime = 0;
  soundTheme.play();
}

// Loop principal
let lastTime = 0;
function gameLoop(timestamp = 0) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  update(deltaTime);
  draw();

  if (!gameOver) {
    requestAnimationFrame(gameLoop);
  }
}

// Eventos de controle
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    jump();

    if (gameOver) {
      restartGame();
      gameLoop();
    }
  }
});

document.getElementById("restartButton").addEventListener("click", () => {
  restartGame();
  gameLoop();
});

// Começa o jogo e toca música
soundTheme.play();
fetchHighScores();
gameLoop();
