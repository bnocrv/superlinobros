import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { db } from "../firebase.js";

let ranking = [];

export async function buscarRanking(caixaRanking) {
  try {
    const refScores = collection(db, "highscores");
    const q = query(refScores, orderBy("score", "desc"), limit(5));
    const snap = await getDocs(q);

    ranking = [];
    snap.forEach((doc) => ranking.push(doc.data()));
    mostrarRanking(caixaRanking);
  } catch (erro) {
    console.error("Erro ao buscar ranking:", erro);
  }
}

export async function adicionarRanking(nome, pontos) {
  try {
    const refScores = collection(db, "highscores");
    await addDoc(refScores, { name: nome, score: pontos });
  } catch (erro) {
    console.error("Erro ao adicionar ranking:", erro);
  }
}

export function mostrarRanking(caixaRanking) {
  if (!caixaRanking) return;

  caixaRanking.replaceChildren();

  if (ranking.length === 0) {
    const vazio = document.createElement("p");
    vazio.textContent = "Nenhuma pontuação ainda.";
    caixaRanking.appendChild(vazio);
    return;
  }

  const titulo = document.createElement("h3");
  titulo.textContent = "🏆 Top 5 Pontuações:";

  const lista = document.createElement("ol");
  ranking.forEach((p) => {
    const item = document.createElement("li");
    const nome = String(p.name || "Anônimo").slice(0, 12);
    const pontos = Number.isFinite(Number(p.score)) ? Number(p.score) : 0;
    item.textContent = `${nome}: ${pontos} 🪙`;
    lista.appendChild(item);
  });

  caixaRanking.append(titulo, lista);
}

export function limparNomeRanking(nome) {
  return (nome || "Anônimo")
    .replace(/[^a-zA-Z0-9À-ÿçÇ ]/g, "")
    .trim()
    .substring(0, 12);
}

export function jogadorEntrouNoTop5(pontuacao) {
  const menorNoTop =
    ranking.length < 5 ? 0 : Number(ranking[ranking.length - 1].score);
  return pontuacao > menorNoTop || ranking.length < 5;
}
