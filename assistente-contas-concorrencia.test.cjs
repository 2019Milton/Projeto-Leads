const test=require('node:test');
const assert=require('node:assert/strict');
const {app,flush,dados,draftServer}=require('./assistente-contas-harness.cjs');
const key='plataforma_leads_assistente_contas_v2_1';
const draft=(extra={})=>({etapa:2,plataformas:['meta'],dados:{...dados},versao:'1',...extra});
const ok=data=>({ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(data))});
const fail=status=>({ok:false,status,json:async()=>({error:'Falha fictícia'})});
const edit=(a,name,value)=>a.window.assistenteSalvarCampoDados({name,value,setAttribute(){}});

test('cache sincronizado carrega atualização do servidor',async()=>{
 const a=app({storage:{[key]:JSON.stringify(draft({pendente_sincronizacao:false}))},draft:draft({dados:{...dados,nome_legal:'Empresa atualizada no servidor'}})});
 await a.open();assert.match(a.html(),/Empresa atualizada no servidor/);
 a.window.fecharAssistenteContasAnuncios();await flush();assert(!a.requests.some(r=>r.method==='PUT'));
});
test('REQUISITO: cache da versão anterior não pode apagar atualização remota sem edição',async()=>{
 let remote=draft({dados:{...dados,nome_legal:'Empresa atualizada em outro computador'}});
 const a=app({storage:{[key]:JSON.stringify(draft({dados:{...dados,nome_legal:'Empresa antiga no cache'}}))},fetch:(url,o)=>{
  if(url!=='/mock/assistente-contas-anuncios')return null;
  if(o.method==='PUT'){remote=JSON.parse(o.body);return ok({sucesso:true});}return ok({rascunho:remote});
 }});
 await a.open();a.window.fecharAssistenteContasAnuncios();await flush();
 assert.equal(remote.dados.nome_legal,'Empresa atualizada em outro computador');
});
test('REQUISITO: edição de uma segunda aba não pode apagar campo atualizado na primeira',async()=>{
 const server=draftServer(draft());
 const a=app({server}),b=app({server});await a.open();await b.open();
 edit(a,'email','atualizado@example.invalid');await a.runTimers();
 edit(b,'telefone','11988887777');await b.runTimers();
 await flush();
 assert.equal(server.value().dados.email,'atualizado@example.invalid');
 assert.equal(server.value().dados.telefone,'11988887777');
});
test('REQUISITO: armazenamento recusado não pode aparecer como salvo no dispositivo',async()=>{
 const a=app({draft:draft(),fetch:(_,o)=>o.method==='PUT'?fail(500):null});await a.open();
 a.context.localStorage.setItem=()=>{throw Object.assign(Error('Cota indisponível'),{name:'QuotaExceededError'});};
 edit(a,'nome_legal','Edição sem armazenamento');await a.runTimers();
 assert.notEqual(JSON.parse(a.storage.get(key)).dados.nome_legal,'Edição sem armazenamento');
 assert.doesNotMatch(a.elements.get('assistente_contas_salvamento').textContent,/Salvo neste dispositivo/);
});
test('cache inválido em JSON não bloqueia a leitura válida do servidor',async()=>{
 const a=app({storage:{[key]:'{invalido'},draft:draft()});await a.open();assert.match(a.html(),/Empresa teste/);
});
test('REQUISITO: resposta parcial de leitura não deve liberar gravação destrutiva',async()=>{
 const a=app({fetch:(url,o)=>url==='/mock/assistente-contas-anuncios'&&!o.method?ok({}):null});await a.open();
 edit(a,'nome_legal','Edição sobre leitura parcial');await a.runTimers();
 assert(!a.requests.some(r=>r.method==='PUT'));
});
test('resposta de leitura 401 não permite escrita sem cadastro carregado',async()=>{
 const a=app({fetch:(url,o)=>url==='/mock/assistente-contas-anuncios'&&!o.method?fail(401):null});await a.open();edit(a,'nome_legal','Não deve salvar');await a.runTimers();
 assert(!a.requests.some(r=>r.method==='PUT'));
});
test('REQUISITO: criação Google usa a moeda e o fuso confirmados, mesmo se o formulário mudar',async()=>{
 let release;
 const a=app({draft:draft({etapa:3,plataformas:['google']}),fetch:(url,o)=>o.method==='PUT'?new Promise(r=>release=r):url.endsWith('/google/criar')?ok({sucesso:true,customer_id:'2222222222'}):null});
 await a.open();a.elements.set('assistente_google_mcc',{value:'1111111111'});
 const pending=a.window.assistenteCriarContaGoogle({});await flush();
 a.window.assistenteIrParaEtapa(2);edit(a,'moeda','USD');edit(a,'fuso','America/Manaus');
 release(a.saved());await pending;
 const request=a.requests.find(r=>r.url.endsWith('/google/criar'));
 assert.equal(request.body.moeda,'BRL');assert.equal(request.body.fuso,'America/Sao_Paulo');
});
test('clique duplo Google produz somente uma solicitação externa',async()=>{
 let release;const a=app({draft:draft({etapa:3,plataformas:['google']}),fetch:url=>url.endsWith('/google/criar')?new Promise(r=>release=r):null});
 await a.open();a.elements.set('assistente_google_mcc',{value:'1111111111'});const first=a.window.assistenteCriarContaGoogle({});await flush();
 await a.window.assistenteCriarContaGoogle({});assert.equal(a.requests.filter(r=>r.url.endsWith('/google/criar')).length,1);
 release(ok({sucesso:true,customer_id:'2222222222'}));await first;
});
test('falha explícita Google devolve botão utilizável e mostra motivo',async()=>{
 const a=app({draft:draft({etapa:3,plataformas:['google']}),fetch:url=>url.endsWith('/google/criar')?fail(503):null});await a.open();a.elements.set('assistente_google_mcc',{value:'1111111111'});
 const button={disabled:false,textContent:'Criar'};await a.window.assistenteCriarContaGoogle(button);assert.equal(button.disabled,false);assert(a.alerts.includes('Falha fictícia'));
});
test('rejeição da IA não cria histórico de etapa concluída',async()=>{
 const a=app({draft:draft({etapa:3}),fetch:url=>url.endsWith('/analisar-tela')?fail(502):null});await a.open();
 await a.window.assistenteAcompanharTela('meta');await a.window.assistenteAcompanharTela('meta');a.window.assistenteAnalisarTelaAgora();a.elements.set('assistente_confirmar_imagem',{checked:true});await a.window.assistenteEnviarImagem();
 assert.match(a.html(),/Falha fictícia/);assert(!a.html().includes('Etapas observadas anteriormente'));
});
test('bloqueio de popup não inicia captura nem envia imagem',async()=>{
 const a=app({draft:draft({etapa:3})});await a.open();a.window.open=()=>null;let calls=0;a.context.navigator.mediaDevices.getDisplayMedia=async()=>{calls++;throw Error('Não esperado');};
 await a.window.assistenteAcompanharTela('meta');assert.equal(calls,0);assert(a.alerts.some(s=>s.includes('bloqueou')));
});
test('REQUISITO: finalizar uma gravação com erro lógico não pode mostrar confirmação',async()=>{
 const a=app({draft:draft(),fetch:(_,o)=>o.method==='PUT'?ok({sucesso:false,error:'Não gravado'}):null});await a.open();edit(a,'nome_legal','Edição');await a.runTimers();
 assert.notEqual(a.elements.get('assistente_contas_salvamento').dataset.estado,'salvo');
});

test('conflito no mesmo campo bloqueia gravação até revisão e preserva mudanças distintas',async()=>{
 const server=draftServer(draft());const a=app({server}),b=app({server});await a.open();await b.open();
 edit(a,'email','primeira@example.invalid');await a.runTimers();
 edit(b,'email','segunda@example.invalid');edit(b,'telefone','11988887777');await b.runTimers();await flush();
 assert.equal(server.value().dados.email,'primeira@example.invalid');assert.match(b.html(),/Revise as alterações/);
 assert.match(b.html(),/primeira@example.invalid/);assert.match(b.html(),/segunda@example.invalid/);
 const writes=b.requests.filter(r=>r.method==='PUT').length;
 b.window.fecharAssistenteContasAnuncios();await flush();await b.open();await b.runTimers();
 assert.match(b.html(),/Revise as alterações/);assert.equal(b.requests.filter(r=>r.method==='PUT').length,writes);
 await b.window.assistenteResolverConflito(false);
 assert.equal(server.value().dados.email,'primeira@example.invalid');assert.equal(server.value().dados.telefone,'11988887777');
 assert(!b.html().includes('Revise as alterações'));assert.equal(b.elements.get('assistente_contas_salvamento').dataset.estado,'salvo');
});

test('revisão explícita pode manter edição local sem apagar outro campo remoto',async()=>{
 const server=draftServer(draft());const a=app({server}),b=app({server});await a.open();await b.open();
 edit(a,'email','primeira@example.invalid');edit(a,'nome_legal','Empresa nova remota');await a.runTimers();
 edit(b,'email','segunda@example.invalid');await b.runTimers();await flush();
 await b.window.assistenteResolverConflito(true);
 assert.equal(server.value().dados.email,'segunda@example.invalid');assert.equal(server.value().dados.nome_legal,'Empresa nova remota');
});

test('terceira alteração enquanto se revisa conflito exige nova revisão',async()=>{
 const server=draftServer(draft());const a=app({server}),b=app({server});await a.open();await b.open();
 edit(a,'email','primeira@example.invalid');await a.runTimers();edit(b,'email','segunda@example.invalid');await b.runTimers();await flush();
 edit(a,'email','terceira@example.invalid');await a.runTimers();await b.window.assistenteResolverConflito(true);
 assert.equal(server.value().dados.email,'terceira@example.invalid');assert.match(b.html(),/terceira@example.invalid/);
});

test('falha de armazenamento preserva edição em memória ao fechar e reabrir',async()=>{
 const a=app({draft:draft(),fetch:(_,o)=>o.method==='PUT'?fail(500):null});await a.open();
 a.context.localStorage.setItem=()=>{throw Error('Sem espaço');};edit(a,'nome_legal','Edição em memória');await a.runTimers();
 assert.match(a.elements.get('assistente_contas_salvamento').textContent,/ainda não salvas/);
 a.window.fecharAssistenteContasAnuncios();await flush();await a.open();assert.match(a.html(),/Edição em memória/);
});

test('resposta de gravação sem rascunho confirmado não vira salvo',async()=>{
 const a=app({draft:draft(),fetch:(_,o)=>o.method==='PUT'?ok({sucesso:true}):null});await a.open();edit(a,'nome_legal','Edição');await a.runTimers();
 assert.notEqual(a.elements.get('assistente_contas_salvamento').dataset.estado,'salvo');
});

test('fila usa a revisão confirmada pela gravação anterior',async()=>{
 let release,first=true;const a=app({draft:draft(),fetch:(_,o)=>{if(o.method==='PUT'&&first){first=false;return new Promise(r=>release=r);}return null;}});await a.open();
 edit(a,'nome_legal','Nome novo');await a.runTimers();edit(a,'telefone','11988887777');await a.runTimers();
 release(a.server.write(a.requests.filter(r=>r.method==='PUT')[0].body));await flush();await flush();
 assert.equal(a.server.value().dados.nome_legal,'Nome novo');assert.equal(a.server.value().dados.telefone,'11988887777');
 assert.equal(a.elements.get('assistente_contas_salvamento').dataset.estado,'salvo');
});

test('conflito pendente é reavaliado após recarga sem enviar a versão local',async()=>{
 const server=draftServer(draft());const a=app({server}),b=app({server});await a.open();await b.open();
 edit(a,'email','primeira@example.invalid');await a.runTimers();edit(b,'email','segunda@example.invalid');await b.runTimers();await flush();
 const recarregada=app({server,storage:Object.fromEntries(b.storage)});await recarregada.open();
 assert.match(recarregada.html(),/Revise as alterações/);
 await recarregada.window.assistenteTentarSalvarRascunho();recarregada.window.fecharAssistenteContasAnuncios();await flush();
 assert(!recarregada.requests.some(r=>r.method==='PUT'));assert.equal(server.value().dados.email,'primeira@example.invalid');
});
