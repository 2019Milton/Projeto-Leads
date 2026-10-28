import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const inicio = html.indexOf("async function desconectarSomenteInstagram(botao) {");
const fim = html.indexOf("\nfunction conectarInstagram() {", inicio);
assert.ok(inicio >= 0 && fim > inicio, "rotina de desconexao presente");
const codigo = html.slice(inicio, fim) + "\nthis.executar = desconectarSomenteInstagram;";

function simular({autoriza = true, status = 200, body = {sucesso:true}} = {}) {
  let chamadas = [], avisos = [], confirmacoes = 0, atualizacoes = 0;
  const ambiente = {
    API: "https://api.exemplo.invalid",
    localStorage: { getItem: () => "token-de-teste" },
    confirm: () => {confirmacoes++; return autoriza;},
    alert: texto => avisos.push(String(texto)),
    fetch: async(url, opcoes) => {
      chamadas.push({url,opcoes});
      return {ok:status>=200 && status<300,json:async()=>body};
    },
    carregarStatusMeta: async() => {atualizacoes++}
  };
  vm.runInNewContext(codigo,ambiente);
  return {executar:ambiente.executar,chamadas,avisos,
    get confirmacoes(){return confirmacoes},
    get atualizacoes(){return atualizacoes}};
}

test("desconexao isolada envia apenas POST autenticado, sem chamar /meta/desconectar",async()=>{
 const t=simular();
 const botao={disabled:false,textContent:"Desconectar somente Instagram"};
 await t.executar(botao);
 assert.equal(t.chamadas.length,1);
 assert.equal(t.chamadas[0].url,"https://api.exemplo.invalid/meta/instagram/desconectar");
 assert.equal(t.chamadas[0].opcoes.method,"POST");
 assert.equal(t.chamadas[0].opcoes.headers.Authorization,"Bearer token-de-teste");
 assert.equal(t.atualizacoes,1);
 assert.equal(botao.disabled,false);
 assert.equal(botao.textContent,"Desconectar somente Instagram");
 assert.ok(t.avisos[0].includes("Meta"));
});
test("cancelamento nao envia qualquer solicitacao",async()=>{
 const t=simular({autoriza:false});
 await t.executar({disabled:false,textContent:"Desconectar somente Instagram"});
 assert.equal(t.chamadas.length,0);
 assert.equal(t.atualizacoes,0);
});
test("erro do backend nao informa sucesso e mantem botao habilitado",async()=>{
 const t=simular({status:404,body:{error:"Sem conexao separada"}});
 const botao={disabled:false,textContent:"Desconectar somente Instagram"};
 await t.executar(botao);
 assert.equal(t.atualizacoes,0);
 assert.equal(botao.disabled,false);
 assert.ok(t.avisos[0].includes("Sem conexao separada"));
});
test("botao so e exibido para OAuth avulso, independente do Instagram da Pagina",()=>{
 assert.match(html,/data\.instagram_conexao_separada\s*===\s*true\s*\?/);
 assert.match(html,/onclick="desconectarSomenteInstagram\(this\)"/);
});
