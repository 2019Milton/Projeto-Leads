const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("scripts inline seguem sintaxe JavaScript válida", () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(match => !/\bsrc\s*=|type\s*=\s*["']application\/ld\+json/i.test(match[1]));
  assert.ok(scripts.length >= 5, "scripts inline não encontrados");
  for (const script of scripts) {
    new vm.Script(script[2], { filename: "index.html:inline" });
  }
});

test("filtro por plataforma existe e tem opções esperadas", () => {
  const match = html.match(/<select\b[^>]*id="filtro_plataforma"[^>]*>[\s\S]*?<\/select>/);
  assert.ok(match, "seletor por plataforma ausente");
  assert.match(match[0], /onchange="carregarCampanhas\(\)"/);
  for (const platform of ["meta", "google", "tiktok", "linkedin", "kwai"]) {
    assert.match(match[0], new RegExp('<option value="' + platform + '">'));
  }
  assert.match(html, /document\.getElementById\("filtro_plataforma"\)\?\.value/);
});

test("filtro normaliza Facebook e Instagram como Meta, sem confundir LinkedIn", () => {
  const match = html.match(/function plataformaFiltroCampanha\(campanha\) \{[\s\S]*?\n\}/);
  assert.ok(match, "helper do filtro não encontrado");
  const ctx = { plataformaCampanhaExibicao: campanha => campanha.plataforma };
  vm.runInNewContext(match[0], ctx);
  for (const p of ["meta", "facebook", "instagram"]) {
    assert.equal(ctx.plataformaFiltroCampanha({ plataforma: p }), "meta");
  }
  for (const p of ["linkedin", "google", "tiktok", "kwai"]) {
    assert.equal(ctx.plataformaFiltroCampanha({ plataforma: p }), p);
  }
});

test("seleção por plataforma participa da filtragem e do cartão multirrede", () => {
  assert.match(html, /if \(filtroPlataforma\) \{\s*campanhasFiltradas = campanhasFiltradas\.filter\(c =>\s*plataformaFiltroCampanha\(c\) === filtroPlataforma/);
  assert.match(html, /filtroPlataforma \? linhasGrupoCampanha\?\.find\(\s*linha => plataformaFiltroCampanha\(linha\) === filtroPlataforma/);
  assert.match(html, /gruposCorrespondentesAosFiltros/);
});

test("LinkedIn ACTIVE não representa entrega verificada", () => {
  assert.match(html, /grupoLinkedinEntregaNaoVerificada/);
  assert.match(html, /GRUPO ATIVO · entrega não verificada/);
  assert.match(html, /não confirma conjuntos nem anúncios em veiculação/);
  assert.match(html, /Veiculação LinkedIn/);
});

test("Lead Sync indisponível traz aviso sobre o acesso negado", () => {
  assert.match(html, /Lead Sync", leadSyncDisponivel \? "Disponível" : "Acesso negado"/);
  assert.match(html, /Lead Sync API sem acesso aprovado para este aplicativo/);
  assert.match(html, /configurarWebhookLinkedIn\(this\)" \$\{adAccountIdAtual && leadSyncDisponivel \? "" : "disabled"\}/);
});