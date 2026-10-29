const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const html = fs.readFileSync(require("node:path").join(__dirname, "..", "index.html"), "utf8");
const helper = html.match(/function leadEhMetaSemRede\(lead\) \{[\s\S]*?\n\}\n\nfunction popularFiltroRedeOrigem\(leads, redesCampanhas = \[\]\) \{[\s\S]*?\n\}/);
assert.ok(helper, "helpers de origem ausentes");
function render(leads, redesCampanhas, valor = "") {
  const select = { value: valor, style: {}, innerHTML: "" };
  const ctx = { document: { getElementById: () => select }, plataformaRealLead: lead => lead.plataforma === "whatsapp" ? lead.origem : lead.plataforma || lead.origem };
  vm.runInNewContext(helper[0], ctx);
  ctx.popularFiltroRedeOrigem(leads, redesCampanhas);
  return select;
}
test("ambas redes de campanha publicada aparecem mesmo com zero leads", () => {
  const s = render([], ["facebook", "instagram"]);
  assert.match(s.innerHTML, /value="facebook">Facebook/);
  assert.match(s.innerHTML, /value="instagram">Instagram/);
  assert.match(s.innerHTML, /Todas as redes/);
});
test("origem desconhecida não é presumida Facebook", () => {
  const s = render([{ origem:"meta", plataforma:"whatsapp", rede_origem:null }], ["instagram"]);
  assert.match(s.innerHTML, /origem não identificada/);
  assert.doesNotMatch(s.innerHTML, /value="facebook">Facebook/);
});
test("não mostra filtro vazio em conta sem campanha ou lead Meta", () => {
  assert.equal(render([{ origem: "google", plataforma: "google" }], []).style.display, "none");
});
test("preserva seleção válida e remove seleção que desapareceu", () => {
  assert.equal(render([], ["instagram"], "instagram").value, "instagram");
  assert.equal(render([], ["facebook"], "instagram").value, "");
});
