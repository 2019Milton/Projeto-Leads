const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const extract = name => html.match(new RegExp(`async function ${name}\\([^]*?\\n\\}`))[0];

function harness({ arquivo = { name: 'novo.mp4' }, escolha = 'video', erro = false } = {}) {
  const events = [];
  const origem = { id: 10, nome: 'Campanha', video_id: 'antigo', video_nome: 'antigo.mp4' };
  const ctx = {
    campanhaEmEdicao: origem,
    plataformasNovasParaPublicarEdicao: () => ['instagram'],
    obterTokenEUsuarioIdCampanha: () => ({ token: 'token-teste', usuario_id: 7 }),
    salvarOrcamentoRede() {}, _orcamentoEdicaoPorRede: {}, abaAtivaAddPlataformaEdicao: 'instagram',
    document: { getElementById: () => null, querySelectorAll: () => [] },
    coletarCamposBasicosCampanha: () => ({ nome: 'Campanha', texto: 'Texto', cta: 'LEARN_MORE', page_id: 'pagina' }),
    obterConfiguracoesCampanha: () => ({ ...origem }),
    normalizarConfiguracoesAvancadasParaEnvio: x => x,
    coletarConfiguracoesAvancadas: () => ({ escolha_midia_instagram: escolha }),
    coletarDadosNichoAtivo: () => ({}), primeiraUrlValidaCampanhaIA: () => null,
    obterArquivoVideoCampanha: () => arquivo,
    orcamentoSalvoRede: () => 30, instagramActorIdSelecionado: 'ig',
    validarArquivoVideoCampanha: () => true,
    uploadVideoCampanha: async args => {
      events.push(['upload', args]);
      if (erro) throw new Error('Falha no upload');
      return { video_id: 'novo-id', video_nome: 'novo.mp4', video_url: null, video_tipo: 'video/mp4', video_tamanho: 55 };
    },
    API: 'https://api.test',
    fetch: async (url, options) => {
      events.push(['save', JSON.parse(options.body)]);
      return { ok: true, json: async () => ({ publicacao_grupo_id: 'grupo' }) };
    },
    plataformasExistentesEdicaoGrupo: new Set(), platNome: x => x,
    mostrarSucessoPublicacao: msg => events.push(['success', msg]),
    mostrarErroPublicacao: msg => events.push(['error', msg])
  };
  vm.createContext(ctx);
  vm.runInContext(extract('prepararVideoRascunhosMeta') + '\n' + extract('salvarRascunhosPlataformasAdicionais'), ctx);
  return { ctx, events, origem };
}

test('adicionar Instagram envia arquivo antes de salvar e persiste o novo ID, sem alterar a campanha original', async () => {
  const { ctx, events, origem } = harness();
  const result = await ctx.salvarRascunhosPlataformasAdicionais();
  assert.equal(result.ok, true);
  assert.deepEqual(events.map(e => e[0]), ['upload', 'save', 'success']);
  assert.equal(events[0][1].usuario_id, 7);
  const cfg = events[1][1].rascunhos[0].configuracoes_avancadas;
  assert.equal(cfg.video_id, 'novo-id');
  assert.equal(cfg.videoId, 'novo-id');
  assert.equal(cfg.video_nome, 'novo.mp4');
  assert.equal(cfg.midia_pendente_reanexar, false);
  assert.equal(origem.video_id, 'antigo');
});

test('upload falho não salva rascunho nem informa sucesso', async () => {
  const { ctx, events } = harness({ erro: true });
  const result = await ctx.salvarRascunhosPlataformasAdicionais();
  assert.equal(result.ok, false);
  assert.deepEqual(events.map(e => e[0]), ['upload', 'error']);
});

test('nome antigo sem arquivo não pode parecer um vídeo pronto no novo rascunho', async () => {
  const { ctx, events } = harness({ arquivo: null });
  const result = await ctx.salvarRascunhosPlataformasAdicionais();
  assert.equal(result.ok, false);
  assert.deepEqual(events.map(e => e[0]), ['error']);
  assert.match(events[0][1], /Selecione o arquivo/);
});

test('Instagram com imagens não envia nem exige vídeo', async () => {
  const { ctx, events } = harness({ escolha: 'imagens' });
  assert.equal((await ctx.salvarRascunhosPlataformasAdicionais()).ok, true);
  assert.deepEqual(events.map(e => e[0]), ['save', 'success']);
  assert.equal(events[0][1].rascunhos[0].configuracoes_avancadas.video_id, undefined);
});

test('Google e TikTok não recebem upload ou identificadores Meta', async () => {
  const { ctx, events } = harness();
  const drafts = ['google', 'tiktok'].map(plataforma => ({ plataforma, configuracoes_avancadas: {} }));
  await ctx.prepararVideoRascunhosMeta(drafts, { name: 'video.mp4' }, 'token', 7);
  assert.equal(events.length, 0);
  assert.deepEqual(drafts.map(d => d.configuracoes_avancadas), [{}, {}]);
});
