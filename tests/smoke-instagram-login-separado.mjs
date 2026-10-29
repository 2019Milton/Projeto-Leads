import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const inicio = html.indexOf("function precisaConectarInstagramSeparado(statusMeta) {");
const fim = html.indexOf("\nasync function carregarStatusMeta() {", inicio);
assert.ok(inicio >= 0 && fim > inicio, "regra de exibição do Instagram Login presente");
const contexto = {};
vm.runInNewContext(html.slice(inicio, fim) + "\nthis.regra = precisaConectarInstagramSeparado;", contexto);
const exibir = x => contexto.regra(x);

test("Instagram encontrado pela Página não oculta a opção de login separado", () => {
  assert.equal(exibir({instagram:{id:"page_ig",username:"plataforma_de_leads"},instagram_conexao_separada:false}), true);
});
test("Instagram separado já conectado não oferece nova conexão por engano", () => {
  assert.equal(exibir({instagram:{username:"plataforma_de_leads"},instagram_conexao_separada:true}), false);
});
test("Sem Instagram o botão permanece disponível", () => {
  assert.equal(exibir({instagram:null,instagram_conexao_separada:false}), true);
});
test("O botão usa o estado independente do OAuth", () => {
  assert.match(html,/\$\{precisaConectarInstagramSeparado\(data\) \? `/);
  assert.match(html,/onclick="conectarInstagram\(\)"/);
});
