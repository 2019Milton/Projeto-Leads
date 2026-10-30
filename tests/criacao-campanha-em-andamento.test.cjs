const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const html = fs.readFileSync(require("node:path").join(__dirname, "..", "index.html"), "utf8");
function bloco(inicio, fim) {
  const a = html.indexOf(inicio), b = html.indexOf(fim, a + inicio.length);
  assert.ok(a >= 0 && b > a, "Bloco não encontrado: " + inicio);
  return html.slice(a, b);
}
const codigo = bloco("let criarCampanhaModalOrigem = null;", "const redesSelecionadasCampanha = new Set();");
const fechar = bloco("function fecharCriarCampanhaModal()", "const redesSelecionadasCampanha = new Set();");
const publicar = bloco("async function criarCampanhaCompleta()", "// Irmã menor de criarCampanhaCompleta()");
test("botão grande permite continuar ou descartar a criação", () => {
  assert.match(html, /id="criar_campanha_acao_pendente"[^>]+style="display:none;"/);
  assert.match(html, /id="btn-continuar-criacao"/);
  assert.match(html, /id="btn-excluir-criacao"/);
  assert.match(html, /onclick="excluirCriacaoCampanha\(\)"/);
  assert.match(html, /min-width: 194px/);
});
test("fechar modal não apaga dados individuais de Meta nem orçamentos", () => {
  assert.doesNotMatch(fechar, /_dadosCampanhaPorRede =/);
  assert.doesNotMatch(fechar, /_orcamentoCampanhaPorRede =/);
  assert.match(codigo, /criacaoCampanhaEmAndamento = true/);
  assert.match(codigo, /if \(!criacaoCampanhaEmAndamento && criacaoCampanhaNecessitaLimpeza\)/);
});
test("descartar é confirmação explícita e não envia requisições de exclusão", () => {
  const descartar = bloco("function excluirCriacaoCampanha()", "function finalizarCriacaoCampanhaLocal()");
  assert.match(descartar, /if \(!confirm\(/);
  assert.match(descartar, /criacaoCampanhaEmAndamento = false/);
  assert.match(descartar, /criacaoCampanhaNecessitaLimpeza = true/);
  assert.doesNotMatch(descartar, /fetch\(|DELETE|location.reload/);
});
test("publicação confirmada desativa o atalho e deixa a próxima criação limpa", () => {
  assert.match(publicar, /finalizarCriacaoCampanhaLocal\(\);\s*fecharCriarCampanhaModal\(\)/);
  assert.match(codigo, /criacaoCampanhaEmAndamento = false;\s*criacaoCampanhaNecessitaLimpeza = true;/);
});
test("estado de visibilidade é atualizado sem recriar campanhas", () => {
  const dom = {
    style: { display: "none" }
  };
  const ctx = {
    document: { getElementById: id => id === "criar_campanha_acao_pendente" ? dom : null },
    usuarioEhCorretorReceptor: () => false
  };
  const funcao = codigo.match(/function atualizarAtalhoCriacaoCampanha\(\) \{[\s\S]*?\n\}/);
  assert.ok(funcao);
  vm.runInNewContext(funcao[0], ctx);
  ctx.criacaoCampanhaEmAndamento = false;
  ctx.atualizarAtalhoCriacaoCampanha();
  assert.equal(dom.style.display, "none");
  ctx.criacaoCampanhaEmAndamento = true;
  ctx.atualizarAtalhoCriacaoCampanha();
  assert.equal(dom.style.display, "inline-flex");
});

test("Criar campanha solicita escolha quando já existe edição em andamento", () => {
  const acao = bloco("function solicitarNovaCriacaoCampanha()", "function abrirCriarCampanhaModal()");
  assert.match(html, /id="btn-abrir-criar-campanha"[\\s\\S]{0,180}onclick="solicitarNovaCriacaoCampanha\\(\\)"/);
  assert.match(acao, /if \\(!criacaoCampanhaEmAndamento\\)/);
  assert.match(acao, /data-acao="continuar"/);
  assert.match(acao, /data-acao="descartar"/);
  assert.match(acao, /data-acao="cancelar"/);
  assert.match(acao, /dialogo\\.showModal\\(\\)/);
  assert.match(acao, /criacaoCampanhaNecessitaLimpeza = true/);
  assert.match(acao, /abrirCriarCampanhaModal\\(\\)/);
  assert.doesNotMatch(acao, /fetch\\(|DELETE|location\\.reload/);
});
test("atalho Continuar edição permanece independente da confirmação", () => {
  assert.match(html, /id="btn-continuar-criacao"[\\s\\S]{0,150}onclick="abrirCriarCampanhaModal\\(\\)"/);
  assert.match(html, /class="criar-campanha-grupo"/);
});
