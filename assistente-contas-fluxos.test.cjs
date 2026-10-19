const test = require('node:test');
const assert = require('node:assert/strict');
const { app, flush, dados } = require('./assistente-contas-harness.cjs');
const ok = data => ({ok:true,status:200,json:async()=>data});
const fail = status => ({ok:false,status,json:async()=>({error:'Falha controlada'})});
const draft = plataforma => ({etapa:3,plataformas:[plataforma],dados});
const conta = id => id==='meta'?{conta_anuncios_id:'act_123'}:id==='google'?{customer_id:'123'}:{advertiser_id:'123'};
const status = id => id==='meta'?{conectado:true,conta_anuncios:{id:'act_123',ativa:true}}:id==='google'?{conectado:true,customer_id:'123',conta:{status:'ENABLED',gerenciadora:false}}:{conectado:true,advertiser_id:'123',pagamento:{disponivel:true,status_conta:'STATUS_ENABLE'}};

test('navegação: dados válidos, voltar, trocar plataforma e preservar empresa',async()=>{
  const a=app();await a.open();a.window.assistenteIrParaEtapa(2);
  for(const [name,value] of Object.entries(dados))a.window.assistenteSalvarCampoDados({name,value,setAttribute(){}});
  a.window.assistenteIrParaEtapa(3);await flush();assert.match(a.html(),/Aguardando autorização/);
  a.window.assistenteIrParaEtapa(1);a.window.assistenteSelecionarPlataforma('google');a.window.assistenteIrParaEtapa(2);
  assert.match(a.html(),/Empresa teste/);a.window.assistenteIrParaEtapa(3);await flush();assert.match(a.html(),/Google Ads/);
});
for(const id of ['meta','google','tiktok']) {
  test(`${id}: autorização sem conta selecionada não confirma conexão`,async()=>{
    const a=app({draft:draft(id),conexoes:[{plataforma:id,status:'conectado',conta:{}}]});await a.open();
    assert.match(a.html(),/Conta de anúncios pendente/);assert(!a.html().includes('Acesso à conta confirmado'));
  });
  test(`${id}: consulta real simulada permite confirmar acesso`,async()=>{
    const a=app({draft:draft(id),conexoes:[{plataforma:id,status:'conectado',conta:conta(id)}],status:status(id)});await a.open();
    assert.match(a.html(),/Acesso à conta confirmado/);assert(!a.html().includes('Conta de anúncios configurada'));
  });
  test(`${id}: ID de outra conta nunca confirma a selecionada`,async()=>{
    const s=status(id);if(id==='meta')s.conta_anuncios.id='act_999';else s[id==='google'?'customer_id':'advertiser_id']='999';
    const a=app({draft:draft(id),conexoes:[{plataforma:id,status:'conectado',conta:conta(id)}],status:s});await a.open();assert.match(a.html(),/Não foi possível confirmar/);
  });
  test(`${id}: token revogado não aparece como acesso confirmado`,async()=>{
    const a=app({draft:draft(id),conexoes:[{plataforma:id,status:'conectado',conta:conta(id)}],status:{conectado:false}});await a.open();assert.match(a.html(),/Não foi possível confirmar/);
  });
}
test('Google: conta administradora não é apresentada como cliente pronta',async()=>{
  const s=status('google');s.conta.gerenciadora=true;
  const a=app({draft:draft('google'),conexoes:[{plataforma:'google',status:'conectado',conta:conta('google')}],status:s});await a.open();assert.match(a.html(),/Selecione uma conta cliente/);
});
test('Google: cancelar a confirmação não faz requisição de criação',async()=>{
  const a=app({draft:draft('google')});await a.open();a.elements.set('assistente_google_mcc',{value:'123'});a.context.confirm=()=>false;
  await a.window.assistenteCriarContaGoogle({});assert(!a.requests.some(r=>r.url.endsWith('/google/criar')));
});
test('Google: erro ao salvar rascunho bloqueia criação externa',async()=>{
  const a=app({draft:draft('google'),fetch:(url,o)=>o.method==='PUT'?fail(500):null});await a.open();a.elements.set('assistente_google_mcc',{value:'123'});
  await a.window.assistenteCriarContaGoogle({});assert(!a.requests.some(r=>r.url.endsWith('/google/criar')));assert(a.alerts.some(x=>x.includes('salvar os dados')));
});
test('salvamento: erro é mostrado sem simular confirmação do servidor',async()=>{
  const a=app({fetch:(url,o)=>o.method==='PUT'?fail(500):null});await a.open();a.window.assistenteSalvarCampoDados({name:'nome_legal',value:'Empresa teste',setAttribute(){}});a.window.fecharAssistenteContasAnuncios();await flush();
  assert.match(a.elements.get('assistente_contas_salvamento').textContent,/tente salvar novamente/);
});
test('REQUISITO: falha de leitura e fechar sem editar não pode sobrescrever rascunho remoto',async()=>{
  const a=app({fetch:(url,o)=>url==='/mock/assistente-contas-anuncios'&&!o.method?fail(500):null});await a.open();
  a.window.fecharAssistenteContasAnuncios();await flush();
  assert.equal(a.requests.filter(r=>r.method==='PUT').length,0,'Falha de leitura seguida de fechar envia rascunho vazio ao servidor');
});
test('REQUISITO: reabrir deve preservar edição local cujo salvamento falhou',async()=>{
  const a=app({fetch:(url,o)=>o.method==='PUT'?fail(500):url==='/mock/assistente-contas-anuncios'?ok({rascunho:{etapa:2,plataformas:['meta'],versao:'1',dados:{...dados,nome_legal:'Empresa antiga'}}}):null});await a.open();
  a.window.assistenteSalvarCampoDados({name:'nome_legal',value:'Empresa corrigida',setAttribute(){}});
  a.window.fecharAssistenteContasAnuncios();await flush();await a.open();
  assert.match(a.html(),/Empresa corrigida/,'GET remoto antigo substitui rascunho local mais recente');
});
test('captura: cancelar compartilhamento não faz análise nem altera conexão',async()=>{
  const a=app({draft:draft('meta')});await a.open();a.context.navigator.mediaDevices.getDisplayMedia=async()=>{throw Object.assign(Error('Cancelado'),{name:'NotAllowedError'});};
  await a.window.assistenteAcompanharTela('meta');await a.window.assistenteAcompanharTela('meta');
  assert(!a.requests.some(r=>r.url.endsWith('/analisar-tela')));assert.match(a.html(),/Aguardando autorização/);
});
test('captura: descartar prévia não envia imagem',async()=>{
  const a=app({draft:draft('meta')});await a.open();await a.window.assistenteAcompanharTela('meta');await a.window.assistenteAcompanharTela('meta');
  a.window.assistenteAnalisarTelaAgora();a.window.assistenteDescartarImagem();await a.window.assistenteEnviarImagem();
  assert(!a.requests.some(r=>r.url.endsWith('/analisar-tela')));
});
test('REQUISITO: voltar para cadastro interrompe compartilhamento que deixa de ser visível',async()=>{
  const a=app({draft:draft('meta')});await a.open();let stopped=false;a.track.stop=()=>stopped=true;
  await a.window.assistenteAcompanharTela('meta');await a.window.assistenteAcompanharTela('meta');
  a.window.assistenteIrParaEtapa(2);assert(stopped,'Stream segue ativo enquanto o cadastro esconde os controles de compartilhamento');
});
test('REQUISITO: orientação dos campos e alertas da IA precisam aparecer na revisão',async()=>{
  const a=app({draft:draft('meta'),fetch:url=>url.endsWith('/analisar-tela')?ok({analise:{sensivel:false,etapa:'Configuração',resumo:'Revise os dados',proxima_acao:'Continue após revisão',campos:[{nome:'Fuso',status:'atencao',orientacao:'ORIENTACAO_TESTE_FUSO'}],alertas:['ALERTA_TESTE_CONTA_ERRADA']}}):null});
  await a.open();await a.window.assistenteAcompanharTela('meta');await a.window.assistenteAcompanharTela('meta');a.window.assistenteAnalisarTelaAgora();a.elements.set('assistente_confirmar_imagem',{checked:true});await a.window.assistenteEnviarImagem();
  assert.match(a.html(),/ORIENTACAO_TESTE_FUSO/);assert.match(a.html(),/ALERTA_TESTE_CONTA_ERRADA/);
});
test('captura: fechar interrompe stream e impede resposta atrasada de salvar',async()=>{
  let release;const a=app({draft:draft('meta'),fetch:url=>url.endsWith('/analisar-tela')?new Promise(r=>release=r):null});await a.open();let stopped=false;a.track.stop=()=>stopped=true;
  await a.window.assistenteAcompanharTela('meta');await a.window.assistenteAcompanharTela('meta');a.window.assistenteAnalisarTelaAgora();a.elements.set('assistente_confirmar_imagem',{checked:true});
  const pending=a.window.assistenteEnviarImagem();await flush();a.window.fecharAssistenteContasAnuncios();release(ok({analise:{sensivel:false,etapa:'TARDIA',campos:[]}}));await pending;
  assert(stopped);assert(a.requests.filter(r=>r.method==='PUT').every(r=>!JSON.stringify(r.body).includes('TARDIA')));
});

test('rascunho pendente sobrevive recarga e só fica salvo após confirmação do servidor',async()=>{
  const antigo={etapa:2,plataformas:['meta'],dados:{...dados,nome_legal:'Empresa antiga'}};
  const a=app({draft:antigo,fetch:(_,o)=>o.method==='PUT'?fail(500):null});await a.open();
  a.window.assistenteSalvarCampoDados({name:'nome_legal',value:'Empresa corrigida',setAttribute(){}});
  a.window.fecharAssistenteContasAnuncios();await flush();
  const b=app({draft:antigo,storage:Object.fromEntries(a.storage)});await b.open();
  assert.match(b.html(),/Empresa corrigida/);
  assert.notEqual(b.elements.get('assistente_contas_salvamento').dataset.estado,'salvo');
  await b.window.assistenteTentarSalvarRascunho();await flush();
  assert.equal(b.requests.filter(r=>r.method==='PUT').at(-1).body.dados.nome_legal,'Empresa corrigida');
  assert.equal(JSON.parse(b.storage.get('plataforma_leads_assistente_contas_v2_1')).pendente_sincronizacao,false);
  assert.equal(b.elements.get('assistente_contas_salvamento').dataset.estado,'salvo');
});

test('falha inicial bloqueia edição e repetição recupera cadastro remoto sem PUT vazio',async()=>{
  let falhando=true;
  const a=app({draft:{etapa:2,plataformas:['meta'],dados},fetch:(url,o)=>falhando&&url==='/mock/assistente-contas-anuncios'&&!o.method?fail(500):null});await a.open();
  a.window.assistenteIrParaEtapa(2);a.window.assistenteSalvarCampoDados({name:'email',value:'novo@example.invalid',setAttribute(){}});
  await a.runTimers();assert(!a.requests.some(r=>r.method==='PUT'));
  assert.match(a.html(),/Não foi possível carregar seu cadastro/);
  falhando=false;await a.window.assistenteTentarSalvarRascunho();
  assert.match(a.html(),/Empresa teste/);assert(!a.requests.some(r=>r.method==='PUT'));
});

test('cache editável após falha de leitura mantém opção de tentar salvar novamente',async()=>{
  const salvo={etapa:2,plataformas:['meta'],dados,pendente_sincronizacao:false};
  const a=app({storage:{plataforma_leads_assistente_contas_v2_1:JSON.stringify(salvo)},fetch:(url,o)=>url==='/mock/assistente-contas-anuncios'&&!o.method?fail(500):null});await a.open();
  a.window.assistenteSalvarCampoDados({name:'nome_legal',value:'Correção local',setAttribute(){}});await a.runTimers();
  assert(!a.requests.some(r=>r.method==='PUT'));
  assert.equal(a.elements.get('assistente_contas_salvamento').dataset.estado,'erro');
  assert.match(a.elements.get('assistente_contas_footer').innerHTML,/Tentar novamente/);
});

test('fechar antes da leitura terminar não salva nem aplica resposta atrasada',async()=>{
  let release;const a=app({fetch:(url,o)=>url==='/mock/assistente-contas-anuncios'&&!o.method?new Promise(r=>release=r):null});await a.open();
  a.window.fecharAssistenteContasAnuncios();release(ok({rascunho:{etapa:2,dados}}));await flush();
  assert(!a.requests.some(r=>r.method==='PUT'));assert(!a.storage.has('plataforma_leads_assistente_contas_v2_1'));
});

test('confirmar salvamento antigo não remove edição posterior pendente',async()=>{
  let release;const a=app({fetch:(_,o)=>o.method==='PUT'?new Promise(r=>release=r):null});await a.open();
  a.window.assistenteSalvarCampoDados({name:'nome_legal',value:'Primeira edição',setAttribute(){}});await a.runTimers();
  a.window.assistenteSalvarCampoDados({name:'nome_legal',value:'Segunda edição',setAttribute(){}});
  release(a.saved());await flush();
  const local=JSON.parse(a.storage.get('plataforma_leads_assistente_contas_v2_1'));
  assert.equal(local.dados.nome_legal,'Segunda edição');assert.equal(local.pendente_sincronizacao,true);
  assert.notEqual(a.elements.get('assistente_contas_salvamento').dataset.estado,'salvo');
});

test('captura autorizada depois de voltar é encerrada imediatamente',async()=>{
  const a=app({draft:draft('meta')});await a.open();let release,stopped=false;
  a.track.stop=()=>stopped=true;a.context.navigator.mediaDevices.getDisplayMedia=()=>new Promise(r=>release=r);
  await a.window.assistenteAcompanharTela('meta');const pending=a.window.assistenteAcompanharTela('meta');
  a.window.assistenteIrParaEtapa(2);release({getTracks:()=>[a.track],getVideoTracks:()=>[a.track]});await pending;
  assert(stopped);assert(!a.html().includes('Encerrar compartilhamento'));
});

test('trocar rede encerra compartilhamento e descarta a imagem pendente',async()=>{
  const a=app({draft:draft('meta')});await a.open();let stopped=false;a.track.stop=()=>stopped=true;
  await a.window.assistenteAcompanharTela('meta');await a.window.assistenteAcompanharTela('meta');a.window.assistenteAnalisarTelaAgora();
  a.window.assistenteSelecionarPlataforma('google');a.elements.set('assistente_confirmar_imagem',{checked:true});await a.window.assistenteEnviarImagem();
  assert(stopped);assert(!a.requests.some(r=>r.url.endsWith('/analisar-tela')));
});

test('orientações da IA são escapadas e não entram no histórico persistido',async()=>{
  const a=app({draft:draft('meta'),fetch:url=>url.endsWith('/analisar-tela')?ok({analise:{sensivel:false,etapa:'Configuração',campos:[{nome:'Nome',status:'atencao',orientacao:'<img src=x onerror=alert(1)> ORIENTACAO_PRIVADA'}],alertas:['<script>ALERTA_PRIVADO</script>']}}):null});await a.open();
  await a.window.assistenteAcompanharTela('meta');await a.window.assistenteAcompanharTela('meta');a.window.assistenteAnalisarTelaAgora();a.elements.set('assistente_confirmar_imagem',{checked:true});await a.window.assistenteEnviarImagem();await a.runTimers();
  assert.match(a.html(),/&lt;script&gt;ALERTA_PRIVADO/);assert(!a.html().includes('<img src=x'));
  assert(a.requests.filter(r=>r.method==='PUT').every(r=>!JSON.stringify(r.body).includes('ORIENTACAO_PRIVADA')&&!JSON.stringify(r.body).includes('ALERTA_PRIVADO')));
});
