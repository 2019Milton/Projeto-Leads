import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const inicio = html.indexOf("function precisaConectarInstagramSeparado(statusMeta) {");
const fim = html.indexOf("\nasync function carregarStatusMeta() {", inicio);
assert.ok(inicio >= 0 && fim > inicio, "regra de exibição do Instagram Login presente");
const contexto = {};
contexto.escaparHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
vm.runInNewContext(html.slice(inicio, fim) + "\nthis.regra = precisaConectarInstagramSeparado;", contexto);
const exibir = x => contexto.regra(x);
const renderizar = x => contexto.renderizarPerfilInstagramSeparado(x);

test("perfil separado nunca usa identidade da Página, nem quando faltam dados", () => {
  const status = { instagram_conexao_separada: true, instagram: {id:'pagina-123', username:'perfil_pagina', profile_picture_url:'https://example.com/pagina.png'} };
  const semPerfil = renderizar(status);
  assert.match(semPerfil, /Dados do perfil indisponíveis/);
  assert.doesNotMatch(semPerfil, /pagina-123|perfil_pagina|pagina.png/);
  const comPerfil = renderizar({...status, instagram_perfil_separado:{id:'oauth-456',username:'perfil_oauth',profile_picture_url:'https://example.com/oauth.png'}});
  assert.match(comPerfil, /@perfil_oauth/);
  assert.match(comPerfil, /ID do Instagram: oauth-456/);
  assert.match(comPerfil, /src="https:\/\/example.com\/oauth.png"/);
  assert.doesNotMatch(comPerfil, /pagina-123|perfil_pagina|pagina.png/);
});

test("perfil ausente ou desconectado não fabrica foto nem conexão", () => {
  assert.equal(renderizar({instagram_conexao_separada:false,instagram_perfil_separado:{id:'antigo'}}), '');
  const resultado = renderizar({instagram_conexao_separada:true,instagram_perfil_separado:{id:'123',username:'teste'}});
  assert.match(resultado, /Foto indisponível/);
  assert.doesNotMatch(resultado, /<img/);
});

test("perfil escapa HTML e rejeita URL de foto insegura", () => {
  const resultado = renderizar({instagram_conexao_separada:true,instagram_perfil_separado:{id:'<script>',username:'<img onerror=alert(1)>',profile_picture_url:'javascript:alert(1)'}});
  assert.doesNotMatch(resultado, /<script>|<img|javascript:/);
  assert.match(resultado, /&lt;script&gt;/);
});

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
