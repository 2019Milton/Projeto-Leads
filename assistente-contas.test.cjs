const test=require('node:test');
const assert=require('node:assert/strict');
const { app, flush, dados, token }=require('./assistente-contas-harness.cjs');
test('cache legado sem proprietário nunca é carregado nem enviado',async()=>{
  const a=app({storage:{plataforma_leads_assistente_contas_v1:JSON.stringify({etapa:3,dados,plataformas:['meta']})}});await a.open();a.window.fecharAssistenteContasAnuncios();await flush();
  assert(!a.storage.has('plataforma_leads_assistente_contas_v1'));
  assert(a.requests.filter(r=>r.method==='PUT').every(r=>!r.body.dados.email));
});
test('troca de usuário não reutiliza rascunho e cancela salvamento atrasado',async()=>{
  const a=app();await a.open();a.window.assistenteSalvarCampoDados({name:'email',value:'empresa-a@example.invalid',setAttribute(){}});
  a.storage.set('token',token(2));await a.open();await a.runTimers();a.window.fecharAssistenteContasAnuncios();await flush();
  assert(a.requests.filter(r=>r.method==='PUT'&&r.headers.Authorization==='Bearer '+token(2)).every(r=>!r.body.dados.email));
});
test('cadastro inválido não avança e mostra erros junto aos campos',async()=>{
  const a=app();await a.open();for(const [name,value]of Object.entries({...dados,email:'invalido',telefone:'1',documento:'123',site:'nao-e-site'}))a.window.assistenteSalvarCampoDados({name,value,setAttribute(){}});
  a.window.assistenteIrParaEtapa(3);assert.match(a.html(),/e-mail válido/);assert.match(a.html(),/dígitos verificadores/);assert(!a.html().includes('Autorize o acesso'));
});
for(const id of ['meta','google','tiktok']) {
  const conta=id==='meta'?{conta_anuncios_id:'act_123'}:id==='google'?{customer_id:'123'}:{advertiser_id:'123'};
  test(id+': falha na consulta nunca aparece como conexão verificada',async()=>{
    const a=app({draft:{etapa:3,plataformas:[id],dados},conexoes:[{plataforma:id,status:'conectado',conta}],statusError:true});await a.open();
    assert.match(a.html(),/Não foi possível confirmar a conexão/);assert(!a.html().includes('Acesso à conta confirmado'));
    assert(a.requests.some(r=>r.url==='/mock/'+id+'/status-completo'));
  });
  test(id+': resposta parcial sem confirmação ao vivo não basta',async()=>{
    const a=app({draft:{etapa:3,plataformas:[id],dados},conexoes:[{plataforma:id,status:'conectado',conta}],status:{conectado:true}});await a.open();assert.match(a.html(),/Não foi possível confirmar a conexão/);
  });
}
test('erro na lista de conexões não é tratado como usuário desconectado',async()=>{
  const a=app({draft:{etapa:3,plataformas:['meta'],dados},connectionError:true});await a.open();assert.match(a.html(),/Verificação indisponível/);assert(!a.html().includes('Aguardando autorização'));
});
test('Meta ativa exibe requisitos separados; nunca promete configuração completa',async()=>{
  const a=app({draft:{etapa:3,plataformas:['meta'],dados},conexoes:[{plataforma:'meta',status:'conectado',conta:{conta_anuncios_id:'act_123'}}],status:{conectado:true,conta_anuncios:{id:'act_123',ativa:true,pagamento_habilitado:false},paginas:[],instagram_utilizavel_na_conta:false}});await a.open();
  assert.match(a.html(),/Conexão verificada/);assert.match(a.html(),/Página do Facebook ainda/);assert.match(a.html(),/Para anunciar no Instagram/);assert.match(a.html(),/Pagamento ou saldo ainda/);assert(!a.html().includes('Conta de anúncios configurada'));
  assert.match(a.elements.get('assistente_contas_footer').innerHTML,/Salvar e fechar/);
});
test('histórico salvo reaparece depois de fechar e reabrir',async()=>{
  const a=app({draft:{etapa:3,plataformas:['meta'],dados,acompanhamento:{meta:{checklist:[{nome:'Nome da conta',status:'preenchido'}],historico:[{etapa:'Conta criada'}]}}}});await a.open();a.window.fecharAssistenteContasAnuncios();await a.open();assert.match(a.html(),/Etapas observadas anteriormente/);assert.match(a.html(),/Nome da conta/);
});

test('resposta atrasada do usuário anterior não preenche a sessão atual',async()=>{
  let resolver;
  const a=app({fetch:(url,options)=>{
    if(url==='/mock/assistente-contas-anuncios'&&!options.method&&options.headers.Authorization==='Bearer '+token(1))return new Promise(r=>resolver=r);
  }});
  await a.open();a.storage.set('token',token(2));await a.open();
  resolver({ok:true,json:async()=>({rascunho:{etapa:2,dados:{email:'empresa-a@example.invalid'}}})});await flush();
  a.window.fecharAssistenteContasAnuncios();await flush();
  assert(!a.html().includes('empresa-a@example.invalid'));
  assert(a.requests.filter(r=>r.method==='PUT'&&r.headers.Authorization==='Bearer '+token(2)).every(r=>!r.body.dados.email));
});

test('Google libera o botão renderizado depois de recuperar um vínculo pendente',async()=>{
  const a=app({draft:{etapa:3,plataformas:['google'],dados},capacidades:{google:{automatico:true,gerenciadoras:[{customer_id:'1111111111',nome:'MCC teste'}]}},fetch:url=>url.endsWith('/google/criar')?{ok:true,json:async()=>({vinculo_pendente:true,customer_id:'2222222222',aviso:'Vínculo pendente'})}:null});
  await a.open();a.elements.set('assistente_google_mcc',{value:'1111111111'});
  await a.window.assistenteCriarContaGoogle({disabled:false,textContent:'Criar'});await flush();
  assert(a.alerts.some(s=>s.includes('Vínculo pendente')));
  assert(!a.html().includes('Solicitação em andamento'));
  assert.match(a.html(),/onclick="assistenteCriarContaGoogle\(this\)"\s*>/);
});

test('captura exige revisão; resultado sensível não entra no próximo contexto nem no histórico',async()=>{
  let analises=0;
  const a=app({draft:{etapa:3,plataformas:['meta'],dados},fetch:url=>url.endsWith('/analisar-tela')?{ok:true,json:async()=>({analise:++analises===1?{sensivel:true,etapa:'Etapa privada',resumo:'Conteúdo privado',campos:[{nome:'Campo privado',status:'preenchido'}]}:{sensivel:false,etapa:'Nome da conta',campos:[{nome:'Nome',status:'preenchido'}]}})}:null});
  await a.open();await a.window.assistenteAcompanharTela('meta');await a.window.assistenteAcompanharTela('meta');
  assert.equal(analises,0);a.window.assistenteAnalisarTelaAgora();assert.equal(a.track.enabled,false);
  await a.window.assistenteEnviarImagem();assert.equal(analises,0);
  a.elements.set('assistente_confirmar_imagem',{checked:true});await a.window.assistenteEnviarImagem();
  a.window.assistenteAlternarPausaTela();a.window.assistenteAnalisarTelaAgora();await a.window.assistenteEnviarImagem();
  const envios=a.requests.filter(r=>r.url.endsWith('/analisar-tela'));
  assert.equal(envios.length,2);assert.equal(envios[1].body.contexto_anterior,'');
  assert(envios.every(r=>r.body.imagem_revisada===true));
  a.window.fecharAssistenteContasAnuncios();await flush();
  const salvo=JSON.parse(a.storage.get('plataforma_leads_assistente_contas_v2_1'));
  assert.equal(salvo.acompanhamento.meta.checklist.length,1);assert.equal(salvo.acompanhamento.meta.checklist[0].nome,'Nome');
  assert(!JSON.stringify(salvo).includes('privad'));
});
