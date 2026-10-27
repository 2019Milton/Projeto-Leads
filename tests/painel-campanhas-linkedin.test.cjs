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

test("filtro de campanhas tem ID exclusivo e opções esperadas", () => {
  const match = html.match(/<select\b[^>]*id="filtro_plataforma_campanhas"[^>]*>[\s\S]*?<\/select>/);
  assert.equal((html.match(/id="filtro_plataforma_campanhas"/g) || []).length, 1, "duplicação do seletor de campanhas");
  assert.equal((html.match(/id="filtro_plataforma"/g) || []).length, 1, "campo existente da Central de Leads alterado");
  assert.ok(match, "seletor por plataforma ausente");
  assert.match(match[0], /onchange="carregarCampanhas\(\)"/);
  for (const platform of ["meta", "google", "tiktok", "linkedin", "kwai"]) {
    assert.match(match[0], new RegExp('<option value="' + platform + '">'));
  }
  assert.match(html, /document\.getElementById\("filtro_plataforma_campanhas"\)\?\.value/);
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
test("filtro executa sobre uma lista sem alterar campanhas de outras redes", () => {
  const snippet = html.match(/  if \(filtroPlataforma\) \{\s*campanhasFiltradas = campanhasFiltradas\.filter\(c =>\s*plataformaFiltroCampanha\(c\) === filtroPlataforma\s*\);\s*\}/);
  assert.ok(snippet, "bloco real de filtragem ausente");
  const campaigns = [
    { id: 1, plataforma: "linkedin" },
    { id: 2, plataforma: "instagram" },
    { id: 3, plataforma: "google" },
    { id: 4, plataforma: "facebook" }
  ];
  const platform = campaign => ["facebook", "instagram", "meta"].includes(campaign.plataforma) ? "meta" : campaign.plataforma;
  const run = filtroPlataforma => {
    const ctx = { campaigns, filtroPlataforma, plataformaFiltroCampanha: platform };
    const script = new vm.Script("let campanhasFiltradas = campaigns.slice(); " + snippet[0] + "; campanhasFiltradas.map(c=>c.id)");
    return script.runInNewContext(ctx);
  };
  assert.deepEqual(Array.from(run("linkedin")), [1]);
  assert.deepEqual(Array.from(run("meta")), [2, 4]);
  assert.deepEqual(Array.from(run("google")), [3]);
  assert.deepEqual(Array.from(run("")), [1, 2, 3, 4]);
});

test("grupo multirrede escolhe rede filtrada antes da aba previamente selecionada", () => {
  const match = html.match(/const c = \(filtroPlataforma \? linhasGrupoCampanha\?\.find\([\s\S]*?\) \|\| campanhaPrincipal;/);
  assert.ok(match, "seleção de rede no grupo ausente");
  const linkedin = { plataforma: "linkedin" };
  const meta = { plataforma: "facebook" };
  const ctx = {
    filtroPlataforma: "linkedin",
    linhasGrupoCampanha: [meta, linkedin],
    chavePorLinhaCampanha: new Map([[meta, "m"], [linkedin, "li"]]),
    chaveAtivaSalva: "m",
    campanhaPrincipal: meta,
    plataformaFiltroCampanha: x => x.plataforma === "facebook" ? "meta" : x.plataforma
  };
  assert.equal(new vm.Script(match[0] + "; c").runInNewContext(ctx), linkedin);
});


test("barra de campanhas supera o width 100% global sem afetar outros formulários", () => {
  assert.match(html, /\.card input,\s*\.card select,\s*\.card textarea\s*\{\s*width: 100%/);
  const desktop = html.match(/#card-campanhas \.campanhas-acoes > select,\s*#card-campanhas \.campanhas-acoes > input\[type="date"\]\s*\{([^}]*)\}/);
  assert.ok(desktop, "regra de largura específica para a barra de campanhas ausente");
  assert.match(desktop[1], /\bwidth:\s*auto\s*;/);
  assert.match(desktop[1], /\bflex:\s*0 1 auto\s*;/);
  assert.match(desktop[1], /\bmargin:\s*0\s*;/);
  assert.match(desktop[1], /\bmax-width:\s*225px\s*;/);
  assert.match(html, /#card-campanhas \.campanhas-topo \.campanhas-acoes\s*\{[^}]*min-width:\s*0/);
  assert.match(html, /@media \(max-width: 1250px\)/);
  assert.match(html, /@media \(max-width: 650px\)/);
  assert.equal((html.match(/id="filtro_plataforma_campanhas"/g) || []).length, 1);
});
