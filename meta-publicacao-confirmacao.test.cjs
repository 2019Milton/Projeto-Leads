const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const source = readFileSync(join(__dirname, 'index.html'), 'utf8');
const start = source.indexOf('async function publicarCampanhaMeta(');
const code = source.slice(start, source.indexOf('// ─── Publica no TikTok', start));

async function run(options = {}) {
  const calls = [], deleted = [], progress = [];
  const env = {
    API: 'https://fixture.invalid', window: {}, FormData,
    montarFontesImagem: () => [1], anexarImagemFormData() {},
    setPublishProgress: (...args) => progress.push(args),
    descartarCampanhaCriadaPorFalha: async id => deleted.push(id),
    console: { error() {} },
    fetch: async url => {
      const step = url.split('/').pop(); calls.push(step);
      const defaults = {
        'upload-imagem': { hash: 'h1' }, campanha: { id: 'campaign_fixture' },
        formulario: { id: 'form_fixture' }, adset: { id: 'adset_fixture' }, anuncio: { id: 'ad_fixture' }
      };
      const selected = options.step || 'anuncio';
      if (step === selected && options.timeout) throw new Error('timeout');
      return {
        ok: step !== selected || options.ok !== false,
        json: async () => {
          if (step === selected && options.invalidJson) throw new SyntaxError('Invalid JSON');
          return step === selected && 'body' in options ? options.body : defaults[step];
        }
      };
    }
  };
  const publish = new Function(...Object.keys(env), code + '\nreturn publicarCampanhaMeta;')(...Object.values(env));
  const result = await publish({ token: 'fixture-only', usuario_id: 1, redeMeta: 'facebook', configuracoesBase: {}, orcamento: 10, imagensArquivos: [] }, false);
  return { result, calls, deleted, progress };
}
test('confirma sucesso somente com ID do anúncio', async () => {
  const r = await run();
  assert.equal(r.result.ok, true);
  assert.deepEqual(r.deleted, []);
  assert.equal(r.progress.at(-1)[0], 100);
});
for (const options of [
  { timeout: true }, { invalidJson: true }, { body: {} }, { body: null },
  { ok: false, body: { error: 'Erro ao criar anúncio', detalhe: 'isCarrossel is not defined' } },
  { ok: false, body: { error: 'Anúncio criado, confirmação pendente', anuncio_criado: true, ad_id: 'ad_fixture' } },
  { ok: false, body: { id: 'ad_fixture' } }
]) {
  test(`preserva campanha após envio: ${JSON.stringify(options)}`, async () => {
    const r = await run(options);
    assert.equal(r.result.ok, false);
    assert.equal(r.result.publicacaoPendente, true);
    assert.match(r.result.mensagem, /campaign_fixture.*preservada/);
    assert.match(r.result.mensagem, /antes de publicar novamente/);
    assert.deepEqual(r.deleted, []);
    assert.ok(!r.progress.some(([p]) => p === 100));
  });
}
test('exibe a mensagem útil do erro aninhado da Meta', async () => {
  const r = await run({ ok: false, body: { error: 'Erro ao criar anúncio', detalhe: { error: { error_user_msg: 'Revise o destino' } } } });
  assert.match(r.result.mensagem, /^Revise o destino/);
});
test('sem pagamento mantém campanha e avisa pendência', async () => {
  const r = await run({ body: { sem_forma_pagamento: true, mensagem: 'Cadastre pagamento' } });
  assert.equal(r.result.semFormaPagamento, true);
  assert.equal(r.result.mensagem, 'Cadastre pagamento');
  assert.deepEqual(r.deleted, []);
});
for (const step of ['upload-imagem', 'campanha', 'formulario', 'adset']) {
  test(`resposta incompleta em ${step} não chega a publicar anúncio`, async () => {
    const r = await run({ step, body: {} });
    assert.equal(r.result.ok, false);
    assert.ok(!r.calls.includes('anuncio'));
  });
}
test('erro anterior ao envio continua limpando campanha incompleta', async () => {
  const r = await run({ step: 'adset', body: { error: 'Público inválido' }, ok: false });
  assert.deepEqual(r.deleted, ['campaign_fixture']);
  assert.equal(r.result.publicacaoPendente, undefined);
});
