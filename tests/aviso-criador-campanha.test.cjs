const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("a origem da geração deve ser verificada pelo marcador do backend", () => {
  assert.match(html, /data\._origem === "openai" \|\| data\._origem === "anthropic"/);
  assert.match(html, /Modelos prontos — não gerados por IA/);
  assert.match(html, /Opções geradas por IA — OpenAI/);
  assert.match(html, /Opções geradas por IA — Anthropic/);
});

test("as opções alternativas são rotuladas individualmente e não parecem geradas por IA", () => {
  assert.match(html, /function renderizarOpcoesCampanhaIA\(sugestoes, geradasPorIA = false\)/);
  assert.match(html, /geradasPorIA \? "Opção" : "Modelo pronto"/);
  assert.match(html, /renderizarOpcoesCampanhaIA\(sugestoesCampanhaIAAtual, geradasPorIA\)/);
});

test("sem marcador de origem, a tela mantém o aviso de conteúdo não confirmado", () => {
  assert.match(html, /!geradasPorIA && !data\.aviso/);
  assert.match(html, /A geração por IA não foi confirmada/);
});
