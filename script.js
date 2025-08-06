const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
jumpSprite.src = 'img/corpo_jump.png';

const rosto = new Image();
rosto.src = 'img/rosto.png';

const chao = new Image();
chao.src = 'img/chao.png';

const fundo = new Image();
fundo.src = 'img/fundo.png';

const moedaImg = new Image();
moedaImg.src = 'img/moeda.png';

const obstaculoChaoImg = new Image();
obstaculoChaoImg.src = 'img/obstaculo.png';

const obstaculoVoadorImg = new Image();
obstaculoVoadorImg.src = 'img/obstaculo_voador.png';

const obstaculoPosteImg = new Image();
obstaculoPosteImg.src = 'img/obstaculo_poste.png';

// Sons
const soundTheme = new Audio('audio/theme.wav');
soundTheme.loop = true;
soundTheme.volume = 0.1;

const soundJump = new Audio('audio/jump.ogg');
const soundDie = new Audio('audio/die.ogg');
const soundPowerup = new Audio('audio/powerup.ogg');

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
    height: 70
  },
  invincible: false,
  visible: true
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

// High Scores: array de objetos {name, score}
let highScores = JSON.parse(localStorage.getItem("highScores")) || [];

function saveHighScores() {
  localStorage.setItem("highScores", JSON.stringify(highScores));
}

function updateHighScores(score, name) {
  // Adiciona o novo score com nome
  highScores.push({ name, score });
  // Ordena do maior para o menor score
  highScores.sort((a, b) => b.score - a.score);
  // Mantém só os 5 primeiros
  highScores = highScores.slice(0, 5);
  saveHighScores();
}

function displayHighScores() {
  const highScoresDiv = document.getElementById('highScores');
  if (!highScoresDiv) return;

  if (highScores.length === 0) {
    highScoresDiv.innerHTML = `<h3>🏆 Top 5 Pontuações:</h3><p>Nenhuma pontuação ainda.</p>`;
    return;
  }

  highScoresDiv.innerHTML = `<h3>🏆 Top 5 Pontuações:</h3><ol>` +
    highScores.map(p => `<li>${p.name}: ${p.score} 🪙</li>`).join('') +
    `</ol>`;
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
      image: obstaculoChaoImg
    });
  } else if (tipo < 0.7) {
    obstacles.push({
      x: canvas.width,
      y: GROUND_Y - 130,
      width: 54,
      height: 31,
      image: obstaculoVoadorImg
    });
  } else {
    obstacles.push({
      x: canvas.width,
      y: GROUND_Y - 80,
      width: 54,
      height: 80,
      image: obstaculoPosteImg
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

  obstacles.forEach(o => o.x -= gameSpeed);
  coins.forEach(c => c.x -= gameSpeed);

  obstacles = obstacles.filter(o => o.x + o.width > 0);
  coins = coins.filter(c => c.x + c.width > 0);

  for (let o of obstacles) {
    if (!player.invincible && checkCollision(player, o)) {
      endGame();
    }
  }

  coins.forEach((coin, i) => {
    if (checkCollision(player, coin)) {
      score++;
      document.getElementById('score').innerText = `🪙 ${score}`;
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

  ctx.drawImage(fundo, 0, 0, canvas.width, canvas.height);

  chaoOffset -= gameSpeed;
  if (chaoOffset <= -70) chaoOffset = 0;
  for (let x = chaoOffset; x < canvas.width; x += 70) {
    ctx.drawImage(chao, x, GROUND_Y, 70, 70);
  }

  obstacles.forEach(o => ctx.drawImage(o.image, o.x, o.y, o.width, o.height));
  coins.forEach(c => ctx.drawImage(moedaImg, c.x, c.y, c.width, c.height));

  if (player.visible) {
    const currentFrame = player.jumping ? jumpSprite : runFrames[player.frame];
    ctx.drawImage(currentFrame, player.x, player.y, player.width, player.height);
    ctx.drawImage(rosto, player.x + 3, player.y + 15, 80, 80);
  }
}

function checkCollision(a, b) {
  const ax = a.x + a.hitbox.offsetX;
  const ay = a.y + a.hitbox.offsetY;
  const aw = a.hitbox.width;
  const ah = a.hitbox.height;

  return (
    ax < b.x + b.width &&
    ax + aw > b.x &&
    ay < b.y + b.height &&
    ay + ah > b.y
  );
}

// Game Loop
let lastTime = 0;
function gameLoop(timestamp = 0) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  update(deltaTime);
  draw();

  if (!gameOver) requestAnimationFrame(gameLoop);
}

// Fim do jogo
function endGame() {
  if (gameOver) return;

  gameOver = true;

  soundTheme.pause();
  soundDie.play();

  let lowestScore = highScores.length < 5 ? 0 : highScores[highScores.length - 1].score;

  if (score > 0 && score > lowestScore) {
    // Entrou no top 5, pede nome antes de mostrar
    setTimeout(() => {
      let playerName = prompt("🎉 Parabéns, você entrou no Top 5! Digite seu nome:");
      if (!playerName || playerName.trim() === "") {
        playerName = "Anônimo";
      } else {
        playerName = playerName.trim().substring(0, 6);
      }
      updateHighScores(score, playerName);
      showGameOverScreen();
    }, 100);
  } else {
    // Não entrou no top 5, ou pontuação zero
    if (score > 0) {
      updateHighScores(score, "Anônimo");
    }
    showGameOverScreen();
  }
}

function showGameOverScreen() {
  document.getElementById('gameOverScreen').classList.remove('hidden');
  document.getElementById('finalScore').innerText = score;
  displayHighScores();
}


// Reinício
function restartGame() {
  score = 0;
  gameSpeed = 4;
  obstacles = [];
  coins = [];
  player.y = GROUND_Y - player.height;
  player.vy = 0;
  player.jumping = false;
  player.frame = 0;
  player.invincible = false;
  player.visible = true;
  gameOver = false;

  document.getElementById('score').innerText = `🪙 0`;
  document.getElementById('gameOverScreen').classList.add('hidden');

  lastTime = 0;
  obstacleTimer = 0;
  coinTimer = 0;
  powerupTimer = 0;
  blinkTimer = 0;

  soundTheme.playbackRate = 1;
  soundTheme.play();

  gameLoop();
}

function activatePowerup() {
  player.invincible = true;
  powerupTimer = 0;
  blinkTimer = 0;
  soundPowerup.play();
  soundTheme.playbackRate = 1.5;
}

// Controles
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !player.jumping && !gameOver) {
    player.vy = JUMP_FORCE;
    player.jumping = true;
    soundJump.play();
  }
  if (e.code === 'Enter' && gameOver) {
    restartGame();
  }
});

canvas.addEventListener('touchstart', () => {
  if (!player.jumping && !gameOver) {
    player.vy = JUMP_FORCE;
    player.jumping = true;
    soundJump.play();
  }
});

window.onload = () => {
  document.getElementById('restartButton').addEventListener('click', restartGame);
  displayHighScores();
  soundTheme.play();
  gameLoop();
};
   