/* =====================================================================================
   GUIA RÁPIDO
===================================================================================== */

// === 1) IMPORTAÇÕES (Firebase) ===========================================
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { db } from "./firebase.js";

// === 2) CONFIGURAÇÕES INICIAIS ======================================================
// Elementos HTML
const telaInicio = document.getElementById("startScreen");
const botaoIniciar = document.getElementById("startButton");
const botaoAlternarSom = document.getElementById("toggleSound");
const telaJogo = document.getElementById("gameCanvas");
const textoPontuacao = document.getElementById("score");
const telaFimDeJogo = document.getElementById("gameOverScreen");
const botaoReiniciar = document.getElementById("restartButton");
const textoPontuacaoFinal = document.getElementById("finalScore");
const caixaRanking = document.getElementById("highScores");
const textoVidas = document.getElementById("lives");

const canvas = telaJogo;
const ctx = canvas.getContext("2d");
const eMobile = window.innerWidth < 768;

// === 3) CONSTANTES DO JOGO ==========================================================
const GRAVIDADE = 0.6;
const GRAVIDADE_QUEDA_RAPIDA = 1.5;
const FORCA_PULO = -14;
const CHAO_Y = canvas.height - 70;

// === 4) CARREGAMENTO DE IMAGENS =====================================================
// Personagem
const framesCorrida = Array.from({ length: 6 }, (_, i) => {
  const img = new Image();
  img.src = `img/corpo_run${i + 1}.png`;
  return img;
});

const spritePulo = new Image();
spritePulo.src = "img/corpo_jump.png";

const framesRolagem = Array.from({ length: 4 }, (_, i) => {
  const img = new Image();
  img.src = `img/corpo_down${i + 1}.png`;
  return img;
});

// Cenário
const imgRosto = new Image();
imgRosto.src = "img/rosto.png";
const imgChao = new Image();
imgChao.src = "img/chao.png";
const imgFundo = new Image();
imgFundo.src = "img/fundo.png";

// Itens
const imgMoeda = new Image();
imgMoeda.src = "img/moeda.png";
const imgObstaculoChao = new Image();
imgObstaculoChao.src = "img/obstaculo.png";
const imgObstaculoVoador = new Image();
imgObstaculoVoador.src = "img/obstaculo_voador.png";
const imgObstaculoPoste = new Image();
imgObstaculoPoste.src = "img/obstaculo_poste.png";

// Efeitos
const framesExplosao = Array.from({ length: 5 }, (_, i) => {
  const img = new Image();
  img.src = `img/flash0${i + 1}.png`;
  return img;
});

// Chefe
const framesChefe = Array.from({ length: 3 }, (_, i) => {
  const img = new Image();
  img.src = `img/boss${i + 1}.png`;
  return img;
});
const imgChefeParado = new Image();
imgChefeParado.src = "img/boss.png";

// === 5) SONS DO JOGO ================================================================
const somTema = new Audio("audio/theme.wav");
let somLigado = true;
somTema.loop = true;
somTema.volume = 0.1;

const somPulo = new Audio("audio/jump.ogg");
const somMorte = new Audio("audio/die.ogg");
const somPowerup = new Audio("audio/powerup.ogg");
const somMoeda = new Audio("audio/coin.ogg");
somMoeda.volume = 0.01;

botaoAlternarSom.addEventListener("click", () => {
  somLigado = !somLigado;
  botaoAlternarSom.innerText = somLigado ? "🔊 Som" : "🔇 Mudo";
  somTema.volume = somLigado ? 0.1 : 0;
});

// === 6) ESTADO DO JOGADOR (CORRIGIDO) ===============================================
const jogador = {
  x: 100,
  y: CHAO_Y - 80,
  largura: 120,
  altura: 65,
  velocidadeY: 0,
  pulando: false,
  rolando: false,
  quadroRolagem: 0,
  atrasoQuadroRolagem: 7,
  temporizadorRolagem: 2,
  quadro: 0,
  atrasoQuadro: 5,

  // CAIXA DE COLISÃO CORRIGIDA (nomes consistentes)
  caixaColisao: {
    deslocX: 20,
    deslocY: 10,
    largura: 40,
    altura: 55,
  },

  // CÓPIA ORIGINAL PARA RESTAURAR
  caixaColisaoOriginal: {
    deslocX: 20,
    deslocY: 10,
    largura: 40,
    altura: 55,
  },

  invencivel: false,
  visivel: true,
  quedaRapida: false,
};

// === 7) VARIÁVEIS DO JOGO ===========================================================
let pontuacao = 0;
let moedasParaPowerup = 0;
let jogoTerminado = false;
let vidas = 3;
let velocidadeJogo = 4;
let deslocChao = 0;
let obstaculos = [];
let moedas = [];
let tempoObstaculo = 0;
let tempoMoeda = 0;
let tempoPowerup = 0;
let chuvaDeMoedasAtiva = false;
let tempoPiscar = 0;
let podeRolar = true;
let toqueInicioY = 0;
let toqueFimY = 0;

const duracaoPowerup = 2000;
const intervaloPiscar = 200;
let ranking = [];

// Efeito de explosão
let explosao = {
  ativo: false,
  quadro: 0,
  x: 0,
  y: 0,
  atrasoQuadro: 5,
  temporizadorQuadro: 0,
};

// === 8) CHEFE DO JOGO ===============================================================
const chefe = {
  x: canvas.width,
  y: CHAO_Y - 120,
  largura: 120,
  altura: 120,
  velocidadeX: 0,
  estado: "parado",
  ativo: false,
  tempoAtaque: 0,
  intervaloAtaque: 1000,
  contagemAtaques: 0,
  maxAtaques: 3,
  tempoRecarga: 0,
  quadro: 0,
  atrasoQuadro: 10,
  temporizadorQuadro: 0,
  imagem: imgChefeParado,
  atingiuJogador: false,
};

// === 9) FUNÇÕES DE RANKING (Firestore - opcional) ===================================
async function buscarRanking() {
  try {
    const refScores = collection(db, "highscores");
    const q = query(refScores, orderBy("score", "desc"), limit(5));
    const snap = await getDocs(q);

    ranking = [];
    snap.forEach((doc) => ranking.push(doc.data()));
    mostrarRanking();
  } catch (erro) {
    console.error("Erro ao buscar ranking:", erro);
  }
}

async function adicionarRanking(nome, pontos) {
  try {
    const refScores = collection(db, "highscores");
    await addDoc(refScores, { name: nome, score: pontos });
  } catch (erro) {
    console.error("Erro ao adicionar ranking:", erro);
  }
}

function mostrarRanking() {
  if (!caixaRanking) return;

  caixaRanking.innerHTML =
    ranking.length === 0
      ? "<p>Nenhuma pontuação ainda.</p>"
      : `
      <h3>🏆 Top 5 Pontuações:</h3>
      <ol>
        ${ranking.map((p) => `<li>${p.name}: ${p.score} 🪙</li>`).join("")}
      </ol>
    `;
}

// === 10) CRIAÇÃO DE OBSTÁCULOS E MOEDAS =============================================
function criarObstaculo() {
  const tipo = Math.random();
  let obstaculo;

  if (tipo < 0.4) {
    obstaculo = {
      x: canvas.width,
      y: CHAO_Y - 31,
      largura: 54,
      altura: 31,
      imagem: imgObstaculoChao,
    };
  } else if (tipo < 0.7) {
    const altura = 31;
    const y =
      Math.floor(Math.random() * (CHAO_Y - 75 - (CHAO_Y - 180) + 1)) +
      (CHAO_Y - 180);

    obstaculo = {
      x: canvas.width,
      y,
      largura: 54,
      altura,
      imagem: imgObstaculoVoador,
    };
  } else {
    obstaculo = {
      x: canvas.width,
      y: CHAO_Y - 80,
      largura: 54,
      altura: 80,
      imagem: imgObstaculoPoste,
    };
  }

  obstaculos.push(obstaculo);
}

function criarMoeda() {
  const minY = CHAO_Y - 180;
  const maxY = CHAO_Y - 100;
  const larguraMoeda = 70;
  const alturaMoeda = 50;

  let y = Math.random() * (maxY - minY) + minY;
  let x = canvas.width;

  moedas.push({ x, y, largura: larguraMoeda, altura: alturaMoeda });
}

// === 11) FUNÇÃO DE COLISÃO (VERSÃO CORRIGIDA) =======================================
function verificarColisao(a, b) {
  // Caixa de colisão do jogador
  const aX = a.x + a.caixaColisao.deslocX;
  const aY = a.y + a.caixaColisao.deslocY;
  const aL = a.caixaColisao.largura;
  const aA = a.caixaColisao.altura;

  // Caixa de colisão do objeto
  const bX = b.x;
  const bY = b.y;
  const bL = b.largura || b.width; // Compatibilidade
  const bA = b.altura || b.height; // Compatibilidade

  return aX < bX + bL && aX + aL > bX && aY < bY + bA && aY + aA > bY;
}

// === 12) ATUALIZAÇÃO DO JOGO ========================================================
function atualizar(deltaTempo) {
  if (jogoTerminado) return;

  // Atualiza explosão
  if (explosao.ativo) {
    if (++explosao.temporizadorQuadro >= explosao.atrasoQuadro) {
      explosao.quadro++;
      explosao.temporizadorQuadro = 0;
      if (explosao.quadro >= framesExplosao.length) explosao.ativo = false;
    }
  }

  // Física do jogador
  const gravidade =
    jogador.pulando && jogador.quedaRapida ? GRAVIDADE_QUEDA_RAPIDA : GRAVIDADE;

  jogador.velocidadeY += gravidade;
  jogador.y += jogador.velocidadeY;

  // Limite no chão
  if (jogador.y >= CHAO_Y - jogador.altura) {
    jogador.y = CHAO_Y - jogador.altura;
    jogador.velocidadeY = 0;
    jogador.pulando = false;
    jogador.quedaRapida = false;

    // Animação de rolagem
    if (
      jogador.rolando &&
      ++jogador.temporizadorRolagem >= jogador.atrasoQuadroRolagem
    ) {
      jogador.quadroRolagem++;
      jogador.temporizadorRolagem = 0;

      if (jogador.quadroRolagem >= framesRolagem.length) {
        jogador.rolando = false;
        jogador.quadroRolagem = 0;
        jogador.caixaColisao = { ...jogador.caixaColisaoOriginal };
      }
    }
  }

  // Animação de corrida
  if (!jogador.pulando && !jogador.rolando && --jogador.atrasoQuadro <= 0) {
    jogador.quadro = (jogador.quadro + 1) % framesCorrida.length;
    jogador.atrasoQuadro = 5;
  }

  // Movimento dos objetos
  obstaculos.forEach((o) => (o.x -= velocidadeJogo));
  moedas.forEach((m) => (m.x -= velocidadeJogo));

  // Remoção de objetos fora da tela
  obstaculos = obstaculos.filter((o) => o.x + o.largura > 0);
  moedas = moedas.filter((m) => m.x + m.largura > 0);

  // Verificação de colisões
  verificarColisoes();

  // Powerups e efeitos
  atualizarPowerups(deltaTempo);

  // Lógica do chefe
  atualizarChefe(deltaTempo);

  // Spawn de objetos
  tempoObstaculo += deltaTempo;
  tempoMoeda += deltaTempo;

  if (tempoObstaculo > 1500) {
    criarObstaculo();
    tempoObstaculo = 0;
  }

  if (tempoMoeda > (chuvaDeMoedasAtiva ? 100 : 400)) {
    criarMoeda();
    tempoMoeda = 0;
  }
}

function verificarColisoes() {
  // Colisão com obstáculos
  for (const o of obstaculos) {
    if (!jogador.invencivel && verificarColisao(jogador, o)) {
      explosao.ativo = true;
      explosao.quadro = 0;
      explosao.temporizadorQuadro = 0;
      explosao.x = jogador.x;
      explosao.y = jogador.y;

      if (--vidas <= 0) fimDeJogo();
      else {
        jogador.invencivel = true;
        tempoPowerup = 0;
        tempoPiscar = 0;
        if (somLigado) somMorte.play();
      }
      break;
    }
  }

  // Colisão com moedas
  for (let i = moedas.length - 1; i >= 0; i--) {
    if (verificarColisao(jogador, moedas[i])) {
      pontuacao++;
      textoPontuacao.innerText = `🪙 ${pontuacao}`;
      moedas.splice(i, 1);
      if (somLigado) somMoeda.cloneNode().play();

      if (!chuvaDeMoedasAtiva) {
        moedasParaPowerup++;
        if (moedasParaPowerup % 10 === 0) velocidadeJogo += 0.5;
        if (moedasParaPowerup % 30 === 0) ativarPowerup();
      }
    }
  }
}

function atualizarPowerups(deltaTempo) {
  if (jogador.invencivel) {
    tempoPowerup += deltaTempo;
    tempoPiscar += deltaTempo;

    if (tempoPiscar > intervaloPiscar) {
      jogador.visivel = !jogador.visivel;
      tempoPiscar = 0;
    }

    if (tempoPowerup > duracaoPowerup) {
      jogador.invencivel = false;
      jogador.visivel = true;
      tempoPowerup = 0;
      chuvaDeMoedasAtiva = false;
      somTema.playbackRate = 1;
    }
  }
}

function atualizarChefe(deltaTempo) {
  if (!chefe.ativo && pontuacao > 0 && pontuacao % 100 === 0) {
    criarChefe();
  }

  if (chefe.ativo) {
    chefe.temporizadorQuadro++;
    if (chefe.temporizadorQuadro >= chefe.atrasoQuadro) {
      chefe.quadro = (chefe.quadro + 1) % framesChefe.length;
      chefe.temporizadorQuadro = 0;
    }

    switch (chefe.estado) {
      case "parado":
        if ((chefe.tempoAtaque += deltaTempo) > 2000) {
          chefe.tempoAtaque = 0;
          chefe.estado = "atacando";
        }
        break;

      case "atacando":
        if ((chefe.tempoAtaque += deltaTempo) > chefe.intervaloAtaque) {
          chefe.tempoAtaque = 0;
          if (++chefe.contagemAtaques >= chefe.maxAtaques) {
            chefe.estado = "correndo";
            chefe.velocidadeX = -6;
          }
        }
        break;

      case "correndo":
        chefe.x += chefe.velocidadeX;

        if (
          !chefe.atingiuJogador &&
          !jogador.invencivel &&
          verificarColisao(jogador, chefe)
        ) {
          const baseJogador = jogador.y + jogador.altura;
          const topoChefe = chefe.y;

          if (baseJogador <= topoChefe + 20 && jogador.velocidadeY > 0) {
            // Derrota o chefe
            chefe.ativo = false;
            chefe.atingiuJogador = true;
            somTema.playbackRate = 1;
            pontuacao += 5;
            jogador.velocidadeY = FORCA_PULO / 2;
          } else {
            // Jogador toma dano
            if (--vidas <= 0) fimDeJogo();
            else {
              jogador.invencivel = true;
              tempoPowerup = 0;
              tempoPiscar = 0;
              if (somLigado) somMorte.play();
            }
            chefe.atingiuJogador = true;
          }
        }
        break;
    }
  }
}

// === 13) RENDERIZAÇÃO DO JOGO =======================================================
function desenhar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fundo
  ctx.drawImage(imgFundo, 0, 0, canvas.width, canvas.height);

  // Chão com scroll
  deslocChao -= velocidadeJogo;
  if (deslocChao <= -canvas.width) deslocChao = 0;
  ctx.drawImage(imgChao, deslocChao, CHAO_Y, canvas.width, 70);
  ctx.drawImage(imgChao, deslocChao + canvas.width, CHAO_Y, canvas.width, 70);

  // Moedas e obstáculos
  moedas.forEach((m) => ctx.drawImage(imgMoeda, m.x, m.y, m.largura, m.altura));
  obstaculos.forEach((o) =>
    ctx.drawImage(o.imagem, o.x, o.y, o.largura, o.altura)
  );

  // Jogador
  if (jogador.visivel) {
    if (jogador.pulando) {
      desenharSprite(
        spritePulo,
        jogador.x,
        jogador.y,
        jogador.largura,
        jogador.altura
      );
    } else if (jogador.rolando) {
      const img = framesRolagem[jogador.quadroRolagem];
      desenharSprite(
        img,
        jogador.x,
        jogador.y + 20,
        jogador.largura,
        jogador.altura * 0.7
      );
    } else {
      const img = framesCorrida[jogador.quadro];
      desenharSprite(
        img,
        jogador.x,
        jogador.y,
        jogador.largura,
        jogador.altura
      );
    }
  }

  // Chefe
  if (chefe.ativo) {
    const img = framesChefe[chefe.quadro] || chefe.imagem;
    ctx.drawImage(img, chefe.x, chefe.y, chefe.largura, chefe.altura);
  }

  // Explosão
  if (explosao.ativo && framesExplosao[explosao.quadro]) {
    ctx.drawImage(
      framesExplosao[explosao.quadro],
      explosao.x - 20,
      explosao.y - 20,
      100,
      100
    );
  }

  // HUD
  ctx.drawImage(imgRosto, 10, 10, 40, 40);
  textoVidas.innerText = `❤️ x${vidas}`;
}

function desenharSprite(img, x, y, largura, altura) {
  if (eMobile) {
    const proporcao = img.width / img.height;
    const novaAltura = altura;
    const novaLargura = novaAltura * proporcao;
    ctx.drawImage(img, x, y, novaLargura, novaAltura);
  } else {
    ctx.drawImage(img, x, y, largura, altura);
  }
}

// === 14) CONTROLES DO JOGADOR =======================================================
function pular() {
  if (!jogador.pulando && !jogador.rolando) {
    jogador.velocidadeY = FORCA_PULO;
    jogador.pulando = true;
    if (somLigado) somPulo.play();
  }
}

function rolar() {
  if (!jogador.pulando && !jogador.rolando && podeRolar) {
    jogador.rolando = true;
    jogador.quadroRolagem = 0;
    jogador.temporizadorRolagem = 0;
    jogador.caixaColisao = {
      deslocX: 10,
      deslocY: 40,
      largura: 45,
      altura: 35,
    };
    podeRolar = false;
    setTimeout(() => (podeRolar = true), 300);
  }
}

function ativarPowerup() {
  jogador.invencivel = true;
  tempoPowerup = 0;
  tempoPiscar = 0;
  chuvaDeMoedasAtiva = true;
  if (somLigado) somPowerup.play();
  somTema.playbackRate = 1.5;
}

// === 15) FIM DE JOGO ================================================================
async function fimDeJogo() {
  jogoTerminado = true;
  if (somLigado) somMorte.play();
  somTema.pause();
  textoPontuacaoFinal.innerText = pontuacao;
  telaFimDeJogo.classList.remove("hidden");

  await buscarRanking();
  const menorNoTop = ranking.length < 5 ? 0 : ranking[ranking.length - 1].score;

  if (pontuacao > menorNoTop || ranking.length < 5) {
    let nome =
      prompt("Parabéns! Você entrou no Top 5! Digite seu nome:", "") ||
      "Anônimo";
    nome = nome
      .replace(/[^a-zA-Z0-9À-ÿçÇ ]/g, "")
      .trim()
      .substring(0, 12);
    await adicionarRanking(nome, pontuacao);
    await buscarRanking();
  }
}

// === 16) INICIALIZAÇÃO DO JOGO ======================================================
function iniciarJogo() {
  // Reset geral
  explosao.ativo = false;
  pontuacao = 0;
  vidas = 3;
  velocidadeJogo = 4;
  obstaculos = [];
  moedas = [];
  moedasParaPowerup = 0;
  jogoTerminado = false;
  deslocChao = 0;

  // Reset jogador
  Object.assign(jogador, {
    y: CHAO_Y - jogador.altura,
    velocidadeY: 0,
    pulando: false,
    rolando: false,
    invencivel: false,
    visivel: true,
    quedaRapida: false,
    caixaColisao: { ...jogador.caixaColisaoOriginal },
  });

  // Reset chefe
  Object.assign(chefe, {
    x: canvas.width,
    y: CHAO_Y - chefe.altura,
    velocidadeX: 0,
    estado: "parado",
    ativo: false,
    tempoAtaque: 0,
    contagemAtaques: 0,
    quadro: 0,
    temporizadorQuadro: 0,
    atingiuJogador: false,
  });

  // Telas
  telaInicio.classList.add("hidden");
  telaFimDeJogo.classList.add("hidden");
  telaJogo.classList.remove("hidden");
  textoPontuacao.innerText = "🪙 0";

  // Áudio
  somTema.currentTime = 0;
  somTema.playbackRate = 1;
  somTema.play();

  // Inicia loop
  ultimoTempo = 0;
  requestAnimationFrame(loopDoJogo);
}

// === 17) LOOP PRINCIPAL =============================================================
let ultimoTempo = 0;
function loopDoJogo(carimboTempo) {
  const deltaTempo = carimboTempo - (ultimoTempo || carimboTempo);
  ultimoTempo = carimboTempo;

  atualizar(deltaTempo);
  desenhar();

  if (!jogoTerminado) requestAnimationFrame(loopDoJogo);
}

// === 18) EVENTOS DE CONTROLE ========================================================
// Botões
botaoIniciar.addEventListener("click", iniciarJogo);
botaoReiniciar.addEventListener("click", iniciarJogo);

// Teclado
window.addEventListener("keydown", (e) => {
  if (jogoTerminado) return;

  if (e.code === "Space" || e.code === "ArrowUp") pular();
  if (e.code === "ArrowDown") {
    if (jogador.pulando) jogador.quedaRapida = true;
    else rolar();
  }
  if (
    e.code === "Enter" &&
    (jogoTerminado || !telaInicio.classList.contains("hidden"))
  ) {
    iniciarJogo();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowDown") jogador.quedaRapida = false;
});

// Touch
window.addEventListener("touchstart", (e) => {
  toqueInicioY = e.touches[0].clientY;
});

window.addEventListener("touchend", (e) => {
  toqueFimY = e.changedTouches[0].clientY;
  const dist = toqueInicioY - toqueFimY;

  if (Math.abs(dist) < 30 || jogoTerminado) return;

  if (dist > 0) pular();
  else if (jogador.pulando) jogador.quedaRapida = true;
  else rolar();
});

// Botões de toque (opcional)
document.getElementById("btn-jump")?.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    if (!jogoTerminado) pular();
  },
  { passive: false }
);

document.getElementById("btn-roll")?.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    if (!jogoTerminado) {
      if (jogador.pulando) jogador.quedaRapida = true;
      else rolar();
    }
  },
  { passive: false }
);

// === 19) FUNÇÕES AUXILIARES =========================================================
function criarChefe() {
  chefe.ativo = true;
  chefe.estado = "parado";
  chefe.x = canvas.width;
  chefe.y = CHAO_Y - chefe.altura;
  chefe.velocidadeX = 0;
  chefe.tempoAtaque = 0;
  chefe.contagemAtaques = 0;
  chefe.quadro = 0;
  chefe.temporizadorQuadro = 0;
  chefe.atingiuJogador = false;
  somTema.playbackRate = 1.5;
}
