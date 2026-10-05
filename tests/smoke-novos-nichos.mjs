import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function assert(cond, message) {
  if (!cond) {
    console.error("FAIL:", message);
    process.exitCode = 1;
  } else {
    console.log("OK:", message);
  }
}

function blocoEntre(inicio, fim) {
  const a = html.indexOf(inicio);
  const b = html.indexOf(fim, a + inicio.length);
  assert(a >= 0, `encontrou bloco: ${inicio}`);
  assert(b > a, `encontrou fim do bloco: ${fim}`);
  return a >= 0 && b > a ? html.slice(a, b) : "";
}

for (const plataforma of ["facebook", "instagram", "tiktok", "google", "linkedin"]) {
  assert(
    html.includes(`data-plat="${plataforma}"`),
    `criador disponibiliza ${plataforma}`
  );
}

const camposFaculdade = [
  "nicho_curso_interesse",
  "nicho_modalidade_faculdade",
  "nicho_turno_faculdade",
  "nicho_tipo_ingresso",
  "nicho_cidade_campus",
  "nicho_publico_alvo_faculdade"
];

const camposDentista = [
  "nicho_tratamento_dentista",
  "nicho_tipo_atendimento_dentista",
  "nicho_regiao_dentista",
  "nicho_forma_atendimento_dentista",
  "nicho_publico_alvo_dentista"
];

for (const campo of [...camposFaculdade, ...camposDentista]) {
  assert(html.includes(`id="${campo}"`), `campo visual existe: ${campo}`);
}

const coletor = blocoEntre(
  "function coletarDadosNichoAtivo()",
  "function restaurarDadosNichoAtivo"
);
for (const campo of ["curso_interesse", "modalidade", "turno", "tipo_ingresso", "cidade_campus", "tratamento", "tipo_atendimento", "regiao", "forma_atendimento"]) {
  assert(coletor.includes(`dados.${campo}`), `coletor persiste ${campo}`);
}

assert(
  coletor.includes('nicho.slug === "faculdade_universidade"'),
  "coletor possui ramo Faculdade/Universidade"
);
assert(
  coletor.includes('nicho.slug === "dentista"'),
  "coletor possui ramo Dentista"
);

const rascunho = blocoEntre(
  "async function salvarRascunhosPlataformasAdicionais()",
  "async function salvarEdicaoCampanha()"
);
assert(
  rascunho.includes("...coletarDadosNichoAtivo()"),
  "rascunho reaproveita os campos especificos do nicho"
);
assert(
  rascunho.includes('(rede === "google" || rede === "linkedin")'),
  "Google e LinkedIn preservam orçamento em reais no rascunho"
);
assert(
  rascunho.includes("Math.round(Math.max(0, valorReais) * 100)"),
  "Meta e TikTok persistem orçamento em centavos"
);

const ia = blocoEntre(
  "function camposFaltantesCampanhaIA",
  "function invalidarSugestoesCampanhaIA"
);
for (const campo of [...camposFaculdade, ...camposDentista]) {
  assert(ia.includes(campo), `IA considera campo: ${campo}`);
}

if (process.exitCode) {
  throw new Error("Smoke test dos novos nichos falhou.");
}

console.log("Smoke test dos novos nichos concluido com sucesso.");
