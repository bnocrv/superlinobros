/* =====================================================================================
   GUIA RÁPIDO
===================================================================================== */

import {
  adicionarRanking,
  buscarRanking,
  jogadorEntrouNoTop5,
  limparNomeRanking,
} from "./js/ranking.js";

// === 2) CONFIGURAÇÕES INICIAIS ======================================================
// Elementos HTML
const telaInicio = document.getElementById("startScreen");
const botaoIniciar = document.getElementById("startButton");
const botaoAlternarSom = document.getElementById("toggleSound");
const telaJogo = document.getElementById("gameCanvas");
const textoPontuacao = document.getElementById("score");
const telaFimDeJogo = document.getElementById("gameOverScreen");
const botaoReiniciar = document.getElementById("restartButton");
const botaoPausa = document.getElementById("pauseButton");
const telaPausa = document.getElementById("pauseScreen");
const botaoContinuar = document.getElementById("resumeButton");
const botaoReiniciarPausa = document.getElementById("pauseRestartButton");
const botaoSomPausa = document.getElementById("pauseSoundButton");
const textoPontuacaoFinal = document.getElementById("finalScore");
const caixaRanking = document.getElementById("highScores");
const textoVidas = document.getElementById("lives");
const statusPowerup = document.getElementById("powerupStatus");
const statusChefe = document.getElementById("bossStatus");
const nomeChefe = document.getElementById("bossName");
const overlayDano = document.getElementById("damageOverlay");
const formularioRanking = document.getElementById("rankingForm");
const campoNomeJogador = document.getElementById("playerName");

const canvas = telaJogo;
const ctx = canvas.getContext("2d");
let telaPequena = window.innerWidth < 768;

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
imgFundo.src =
  window.matchMedia("(max-width: 767px) and (orientation: portrait)").matches
    ? "img/fundo_mobile.jpg"
    : "img/fundo.jpg";

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

const framesJoe = Array.from({ length: 3 }, (_, i) => {
  const img = new Image();
  img.src = `img/joe${i + 1}.png`;
  return img;
});

const imgChefeParado = new Image();
imgChefeParado.src = "img/boss.png";

const limitesSprites = {
  "corpo_run1.png": { x: 0, y: 0, largura: 0.9394, altura: 1 },
  "corpo_run2.png": { x: 0, y: 0, largura: 1, altura: 1 },
  "corpo_run3.png": { x: 0.1061, y: 0, largura: 0.8333, altura: 1 },
  "corpo_run4.png": { x: 0, y: 0, largura: 1, altura: 1 },
  "corpo_run5.png": { x: 0, y: 0, largura: 1, altura: 1 },
  "corpo_run6.png": { x: 0, y: 0, largura: 1, altura: 1 },
  "corpo_jump.png": { x: 0.0455, y: 0, largura: 0.9091, altura: 1 },
  "corpo_down1.png": { x: 0.0909, y: 0.0455, largura: 0.8485, altura: 0.9394 },
  "corpo_down2.png": { x: 0, y: 0.1515, largura: 1, altura: 0.803 },
  "corpo_down3.png": { x: 0, y: 0, largura: 0.9394, altura: 1 },
  "corpo_down4.png": { x: 0.0152, y: 0, largura: 0.9848, altura: 1 },
  "moeda.png": { x: 0.2429, y: 0.2571, largura: 0.5143, altura: 0.5143 },
  "obstaculo.png": { x: 0, y: 0.18, largura: 1, altura: 0.82 },
  "obstaculo_voador.png": { x: 0.02, y: 0, largura: 0.98, altura: 1 },
  "obstaculo_poste.png": { x: 0, y: 0, largura: 1, altura: 1 },
  "boss.png": { x: 0, y: 0, largura: 1, altura: 1 },
  "boss1.png": { x: 0, y: 0, largura: 1, altura: 1 },
  "boss2.png": { x: 0.0111, y: 0, largura: 0.9889, altura: 1 },
  "boss3.png": { x: 0.0167, y: 0, largura: 0.9722, altura: 1 },
  "joe1.png": { x: 0, y: 0, largura: 1, altura: 1 },
  "joe2.png": { x: 0, y: 0, largura: 1, altura: 1 },
  "joe3.png": { x: 0, y: 0, largura: 1, altura: 1 },
};

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

function tocarAudio(audio) {
  if (!somLigado) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function iniciarTema() {
  somTema.play().catch(() => {});
}

function atualizarMidiaResponsiva() {
  telaPequena = window.innerWidth < 768;
  imgFundo.src =
    window.matchMedia("(max-width: 767px) and (orientation: portrait)").matches
      ? "img/fundo_mobile.jpg"
      : "img/fundo.jpg";
}

botaoAlternarSom.addEventListener("click", () => {
  somLigado = !somLigado;
  botaoAlternarSom.innerText = somLigado ? "🔊 Som" : "🔇 Mudo";
  if (botaoSomPausa) botaoSomPausa.innerText = somLigado ? "Som: ON" : "Som: OFF";
  somTema.volume = somLigado ? 0.1 : 0;
});

// === 6) ESTADO DO JOGADOR ==========================================================
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
  invencivel: false,
  visivel: true,
  quedaRapida: false,
};

// === 7) VARIÁVEIS DO JOGO ===========================================================
let pontuacao = 0;
let moedasParaPowerup = 0;
let jogoTerminado = false;
let jogoPausado = false;
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
let mostrarHitboxes = false;
let ultimoMarcoChefe = 0;

const duracaoPowerup = 2000;
const intervaloPiscar = 200;

if (botaoSomPausa) botaoSomPausa.innerText = somLigado ? "Som: ON" : "Som: OFF";

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
  tipo: "boss",
  frames: framesChefe,
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
  velocidadeAtaque: -6,
  quadro: 0,
  atrasoQuadro: 10,
  temporizadorQuadro: 0,
  imagem: imgChefeParado,
  atingiuJogador: false,
};

function exibirFormularioRanking() {
  formularioRanking?.classList.remove("hidden");
  campoNomeJogador?.focus();
}

function esconderFormularioRanking() {
  formularioRanking?.classList.add("hidden");
  formularioRanking?.reset();
}

function registrarMoedaColetada() {
  pontuacao++;
  textoPontuacao.innerText = `🪙 ${pontuacao}`;
}

function piscarDano() {
  overlayDano?.classList.remove("hidden");
  overlayDano?.classList.remove("damage-active");
  void overlayDano?.offsetWidth;
  overlayDano?.classList.add("damage-active");

  setTimeout(() => {
    overlayDano?.classList.add("hidden");
    overlayDano?.classList.remove("damage-active");
  }, 280);
}

function receberDano() {
  explosao.ativo = true;
  explosao.quadro = 0;
  explosao.temporizadorQuadro = 0;
  explosao.x = jogador.x;
  explosao.y = jogador.y;
  piscarDano();

  if (--vidas <= 0) {
    fimDeJogo();
    return;
  }

  jogador.invencivel = true;
  tempoPowerup = 0;
  tempoPiscar = 0;
  tocarAudio(somMorte);
}

function atualizarStatusChefe() {
  if (!statusChefe || !chefe.ativo) {
    statusChefe?.classList.add("hidden");
    return;
  }

  nomeChefe.textContent = chefe.tipo === "joe" ? "Joe" : "Tonha";
  statusChefe.style.setProperty("--boss-progress", "100%");
  statusChefe.classList.remove("hidden");
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
      caixaColisao: caixaRelativa("obstaculo.png"),
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
      caixaColisao: caixaRelativa("obstaculo_voador.png"),
    };
  } else {
    obstaculo = {
      x: canvas.width,
      y: CHAO_Y - 80,
      largura: 54,
      altura: 80,
      imagem: imgObstaculoPoste,
      caixaColisao: caixaRelativa("obstaculo_poste.png"),
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

  moedas.push({
    x,
    y,
    largura: larguraMoeda,
    altura: alturaMoeda,
    caixaColisao: caixaRelativa("moeda.png"),
  });
}

function obterIntervaloObstaculo() {
  return Math.max(850, 1500 - pontuacao * 8);
}

function obterIntervaloMoeda() {
  if (chuvaDeMoedasAtiva) return 100;
  return Math.max(260, 420 - pontuacao * 2);
}

function obterTipoChefeDoMarco() {
  if (pontuacao <= 0) return null;
  if (pontuacao % 100 === 0) return "boss";
  if ((pontuacao - 50) % 100 === 0) return "joe";
  return null;
}

// === 11) COLISÃO ====================================================================
function caixaRelativa(nomeArquivo) {
  return limitesSprites[nomeArquivo] || { x: 0, y: 0, largura: 1, altura: 1 };
}

function obterNomeImagem(img) {
  return img?.src?.split("/").pop() || "";
}

function calcularRetanguloSprite(img, x, y, largura, altura) {
  if (!img.complete || img.naturalWidth === 0) {
    return { x, y, largura, altura };
  }

  const proporcao = img.naturalWidth / img.naturalHeight;
  const novaAltura = altura;
  const novaLargura = novaAltura * proporcao;
  const deslocX = telaPequena ? 0 : (largura - novaLargura) / 2;

  return {
    x: x + deslocX,
    y,
    largura: novaLargura,
    altura: novaAltura,
  };
}

function obterSpriteJogador() {
  if (jogador.pulando) {
    return {
      img: spritePulo,
      x: jogador.x,
      y: jogador.y,
      largura: jogador.largura,
      altura: jogador.altura,
    };
  }

  if (jogador.rolando) {
    return {
      img: framesRolagem[jogador.quadroRolagem],
      x: jogador.x,
      y: jogador.y + 20,
      largura: jogador.largura,
      altura: jogador.altura * 0.7,
    };
  }

  return {
    img: framesCorrida[jogador.quadro],
    x: jogador.x,
    y: jogador.y,
    largura: jogador.largura,
    altura: jogador.altura,
  };
}

function obterCaixaJogador() {
  const sprite = obterSpriteJogador();
  const retangulo = calcularRetanguloSprite(
    sprite.img,
    sprite.x,
    sprite.y,
    sprite.largura,
    sprite.altura
  );
  const limite = caixaRelativa(obterNomeImagem(sprite.img));

  return {
    x: retangulo.x + retangulo.largura * limite.x,
    y: retangulo.y + retangulo.altura * limite.y,
    largura: retangulo.largura * limite.largura,
    altura: retangulo.altura * limite.altura,
  };
}

function obterCaixaObjeto(objeto) {
  if (objeto === chefe) {
    const img = chefe.frames[chefe.quadro] || chefe.imagem;
    const limite = caixaRelativa(obterNomeImagem(img));

    return {
      x: chefe.x + chefe.largura * limite.x,
      y: chefe.y + chefe.altura * limite.y,
      largura: chefe.largura * limite.largura,
      altura: chefe.altura * limite.altura,
    };
  }

  const caixa = objeto.caixaColisao || { x: 0, y: 0, largura: 1, altura: 1 };

  return {
    x: objeto.x + objeto.largura * caixa.x,
    y: objeto.y + objeto.altura * caixa.y,
    largura: objeto.largura * caixa.largura,
    altura: objeto.altura * caixa.altura,
  };
}

function verificarColisao(a, b) {
  const caixaA = a === jogador ? obterCaixaJogador() : obterCaixaObjeto(a);
  const caixaB = b === jogador ? obterCaixaJogador() : obterCaixaObjeto(b);

  return (
    caixaA.x < caixaB.x + caixaB.largura &&
    caixaA.x + caixaA.largura > caixaB.x &&
    caixaA.y < caixaB.y + caixaB.altura &&
    caixaA.y + caixaA.altura > caixaB.y
  );
}

// === 12) ATUALIZAÇÃO DO JOGO ========================================================
function atualizar(deltaTempo) {
  if (jogoTerminado || jogoPausado) return;

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
  atualizarStatusChefe();

  // Lógica do chefe
  atualizarChefe(deltaTempo);

  // Spawn de objetos
  tempoObstaculo += deltaTempo;
  tempoMoeda += deltaTempo;

  if (tempoObstaculo > obterIntervaloObstaculo()) {
    criarObstaculo();
    tempoObstaculo = 0;
  }

  if (tempoMoeda > obterIntervaloMoeda()) {
    criarMoeda();
    tempoMoeda = 0;
  }
}

function verificarColisoes() {
  // Colisão com obstáculos
  for (const o of obstaculos) {
    if (!jogador.invencivel && verificarColisao(jogador, o)) {
      receberDano();
      break;
    }
  }

  // Colisão com moedas
  for (let i = moedas.length - 1; i >= 0; i--) {
    if (verificarColisao(jogador, moedas[i])) {
      registrarMoedaColetada();
      moedas.splice(i, 1);
      if (somLigado) somMoeda.cloneNode().play().catch(() => {});

      if (!chuvaDeMoedasAtiva) {
        moedasParaPowerup++;
        if (moedasParaPowerup % 10 === 0) velocidadeJogo += 0.5;
        if (moedasParaPowerup % 30 === 0) ativarPowerup();
      }
    }
  }
}

function atualizarPowerups(deltaTempo) {
  if (statusPowerup) {
    statusPowerup.classList.toggle("hidden", !chuvaDeMoedasAtiva);
  }

  if (jogador.invencivel) {
    tempoPowerup += deltaTempo;
    tempoPiscar += deltaTempo;
    const progresso = Math.max(0, 1 - tempoPowerup / duracaoPowerup) * 100;
    statusPowerup?.style.setProperty("--powerup-progress", `${progresso}%`);

    if (tempoPiscar > intervaloPiscar) {
      jogador.visivel = !jogador.visivel;
      tempoPiscar = 0;
    }

    if (tempoPowerup > duracaoPowerup) {
      jogador.invencivel = false;
      jogador.visivel = true;
      tempoPowerup = 0;
      chuvaDeMoedasAtiva = false;
      statusPowerup?.classList.add("hidden");
      somTema.playbackRate = 1;
    }
  }
}

function atualizarChefe(deltaTempo) {
  const tipoChefe = obterTipoChefeDoMarco();

  if (!chefe.ativo && tipoChefe && ultimoMarcoChefe !== pontuacao) {
    criarChefe(tipoChefe);
    ultimoMarcoChefe = pontuacao;
  }

  if (chefe.ativo) {
    chefe.temporizadorQuadro++;
    if (chefe.temporizadorQuadro >= chefe.atrasoQuadro) {
      chefe.quadro = (chefe.quadro + 1) % chefe.frames.length;
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
            chefe.velocidadeX = chefe.velocidadeAtaque;
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
          const caixaJogador = obterCaixaJogador();
          const caixaChefe = obterCaixaObjeto(chefe);
          const baseJogador = caixaJogador.y + caixaJogador.altura;
          const topoChefe = caixaChefe.y;

          if (baseJogador <= topoChefe + 20 && jogador.velocidadeY > 0) {
            // Derrota o chefe
            chefe.ativo = false;
            chefe.atingiuJogador = true;
            somTema.playbackRate = 1;
            pontuacao += 5;
            textoPontuacao.innerText = `🪙 ${pontuacao}`;
            statusChefe?.classList.add("hidden");
            jogador.velocidadeY = FORCA_PULO / 2;
          } else {
            // Jogador toma dano
            receberDano();
            chefe.atingiuJogador = true;
          }
        }
        break;
    }

    if (chefe.x + chefe.largura < 0) {
      chefe.ativo = false;
      chefe.estado = "parado";
      chefe.atingiuJogador = false;
      statusChefe?.classList.add("hidden");
      somTema.playbackRate = chuvaDeMoedasAtiva ? 1.5 : 1;
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
    const img = chefe.frames[chefe.quadro] || chefe.imagem;
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

  if (mostrarHitboxes) desenharHitboxes();

  // HUD
  ctx.drawImage(imgRosto, 10, 10, 40, 40);
  textoVidas.innerText = `❤️ x${vidas}`;
}

function desenharRetanguloHitbox(caixa, cor) {
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.lineWidth = 2;
  ctx.strokeRect(caixa.x, caixa.y, caixa.largura, caixa.altura);
  ctx.restore();
}

function desenharHitboxes() {
  desenharRetanguloHitbox(obterCaixaJogador(), "#00ff66");
  obstaculos.forEach((obstaculo) =>
    desenharRetanguloHitbox(obterCaixaObjeto(obstaculo), "#ff3b3b")
  );
  moedas.forEach((moeda) =>
    desenharRetanguloHitbox(obterCaixaObjeto(moeda), "#ffe04f")
  );
  if (chefe.ativo) desenharRetanguloHitbox(obterCaixaObjeto(chefe), "#ff68ff");
}

function desenharSprite(img, x, y, largura, altura) {
  const retangulo = calcularRetanguloSprite(img, x, y, largura, altura);
  ctx.drawImage(
    img,
    retangulo.x,
    retangulo.y,
    retangulo.largura,
    retangulo.altura
  );
}

// === 14) CONTROLES DO JOGADOR =======================================================
function pular() {
  if (!jogador.pulando && !jogador.rolando) {
    jogador.velocidadeY = FORCA_PULO;
    jogador.pulando = true;
    tocarAudio(somPulo);
  }
}

function rolar() {
  if (!jogador.pulando && !jogador.rolando && podeRolar) {
    jogador.rolando = true;
    jogador.quadroRolagem = 0;
    jogador.temporizadorRolagem = 0;
    podeRolar = false;
    setTimeout(() => (podeRolar = true), 300);
  }
}

function ativarPowerup() {
  jogador.invencivel = true;
  tempoPowerup = 0;
  tempoPiscar = 0;
  chuvaDeMoedasAtiva = true;
  statusPowerup?.classList.remove("hidden");
  statusPowerup?.style.setProperty("--powerup-progress", "100%");
  tocarAudio(somPowerup);
  somTema.playbackRate = 1.5;
}

function alternarPausa(forcarEstado) {
  if (jogoTerminado || !telaInicio.classList.contains("hidden")) return;

  jogoPausado = typeof forcarEstado === "boolean" ? forcarEstado : !jogoPausado;
  telaPausa?.classList.toggle("hidden", !jogoPausado);
  botaoPausa.innerText = jogoPausado ? "▶ Voltar" : "⏸ Pausa";

  if (jogoPausado) {
    somTema.pause();
  } else {
    ultimoTempo = 0;
    if (somLigado) iniciarTema();
  }
}

// === 15) FIM DE JOGO ================================================================
async function fimDeJogo() {
  jogoTerminado = true;
  jogoPausado = false;
  tocarAudio(somMorte);
  somTema.pause();
  textoPontuacaoFinal.innerText = pontuacao;
  telaPausa?.classList.add("hidden");
  botaoPausa.innerText = "⏸ Pausa";
  statusPowerup?.classList.add("hidden");
  statusChefe?.classList.add("hidden");
  telaFimDeJogo.classList.remove("hidden");
  esconderFormularioRanking();

  await buscarRanking(caixaRanking);
  if (jogadorEntrouNoTop5(pontuacao)) exibirFormularioRanking();
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
  jogoPausado = false;
  ultimoMarcoChefe = 0;
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
  });

  // Reset chefe
  Object.assign(chefe, {
    tipo: "boss",
    frames: framesChefe,
    imagem: imgChefeParado,
    x: canvas.width,
    y: CHAO_Y - chefe.altura,
    velocidadeX: 0,
    velocidadeAtaque: -6,
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
  telaPausa?.classList.add("hidden");
  esconderFormularioRanking();
  statusPowerup?.classList.add("hidden");
  statusChefe?.classList.add("hidden");
  telaJogo.classList.remove("hidden");
  textoPontuacao.innerText = "🪙 0";
  botaoPausa.innerText = "⏸ Pausa";
  if (botaoSomPausa) botaoSomPausa.innerText = somLigado ? "Som: ON" : "Som: OFF";

  // Áudio
  somTema.currentTime = 0;
  somTema.playbackRate = 1;
  iniciarTema();

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
botaoPausa.addEventListener("click", () => alternarPausa());
botaoContinuar.addEventListener("click", () => alternarPausa(false));
botaoReiniciarPausa.addEventListener("click", iniciarJogo);
botaoSomPausa.addEventListener("click", () => botaoAlternarSom.click());

formularioRanking?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = limparNomeRanking(campoNomeJogador.value);

  if (!nome) return;

  await adicionarRanking(nome, pontuacao);
  esconderFormularioRanking();
  await buscarRanking(caixaRanking);
});

// Teclado
window.addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) {
    e.preventDefault();
  }

  if (e.code === "KeyP") {
    alternarPausa();
    return;
  }

  if (e.code === "KeyH") {
    mostrarHitboxes = !mostrarHitboxes;
    return;
  }

  if (
    e.code === "Enter" &&
    (jogoTerminado || !telaInicio.classList.contains("hidden"))
  ) {
    iniciarJogo();
    return;
  }

  if (jogoTerminado || !telaInicio.classList.contains("hidden")) return;
  if (jogoPausado) return;

  if (e.code === "Space" || e.code === "ArrowUp") pular();
  if (e.code === "ArrowDown") {
    if (jogador.pulando) jogador.quedaRapida = true;
    else rolar();
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

  if (
    Math.abs(dist) < 30 ||
    jogoTerminado ||
    jogoPausado ||
    !telaInicio.classList.contains("hidden")
  ) {
    return;
  }

  if (dist > 0) pular();
  else if (jogador.pulando) jogador.quedaRapida = true;
  else rolar();
});

// Botões de toque (opcional)
document.getElementById("btn-jump")?.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    if (!jogoTerminado && !jogoPausado && telaInicio.classList.contains("hidden")) {
      pular();
    }
  },
  { passive: false }
);

document.getElementById("btn-roll")?.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    if (!jogoTerminado && !jogoPausado && telaInicio.classList.contains("hidden")) {
      if (jogador.pulando) jogador.quedaRapida = true;
      else rolar();
    }
  },
  { passive: false }
);

window.addEventListener("resize", atualizarMidiaResponsiva);
window.addEventListener("orientationchange", atualizarMidiaResponsiva);

// === 19) FUNÇÕES AUXILIARES =========================================================
function criarChefe(tipo = "boss") {
  const configChefe =
    tipo === "joe"
      ? { frames: framesJoe, imagem: framesJoe[0], velocidadeX: -7 }
      : { frames: framesChefe, imagem: imgChefeParado, velocidadeX: -6 };

  chefe.tipo = tipo;
  chefe.frames = configChefe.frames;
  chefe.imagem = configChefe.imagem;
  chefe.ativo = true;
  chefe.estado = "parado";
  chefe.x = canvas.width;
  chefe.y = CHAO_Y - chefe.altura;
  chefe.velocidadeX = 0;
  chefe.velocidadeAtaque = configChefe.velocidadeX;
  chefe.tempoAtaque = 0;
  chefe.contagemAtaques = 0;
  chefe.quadro = 0;
  chefe.temporizadorQuadro = 0;
  chefe.atingiuJogador = false;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
