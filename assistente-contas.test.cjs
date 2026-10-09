const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const regras=require('./assistente-contas-regras.js');
const codigo=fs.readFileSync(__dirname+'/assistente-contas.js','utf8');
const token=id=>Buffer.from(id+':qa@example.invalid').toString('base64');
const dados={nome_legal:'Empresa teste',email:'qa@example.invalid',telefone:'11900000000',pais:'BR',moeda:'BRL',fuso:'America/Sao_Paulo'};
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function app(config={}) {
  const elements=new Map(['assistente_contas_modal','assistente_contas_corpo','assistente_contas_etapas','assistente_contas_footer','assistente_contas_salvamento'].map(id=>[id,{innerHTML:'',textContent:'',style:{display:'none'},dataset:{}}]));
  const storage=new Map(Object.entries(config.storage||{}));storage.set('token',token(1));
  const requests=[],alerts=[],timers=new Map();let timerId=0;
  const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  const track={enabled:true,stop(){},addEventListener(){}};
  const window={AssistenteContasRegras:regras,addEventListener(){},carregarHub:async()=>{},open:()=>({focus(){}})};
  const context=vm.createContext({window,localStorage,API:'/mock',AbortController,AbortSignal,URL,navigator:{mediaDevices:{getDisplayMedia:async()=>({getTracks:()=>[track],getVideoTracks:()=>[track]})}},atob:s=>Buffer.from(s,'base64').toString(),alert:s=>alerts.push(s),confirm:()=>true,console,
    document:{body:{style:{}},hidden:false,addEventListener(){},getElementById:id=>elements.get(id)||null,querySelectorAll:()=>[],createElement:tag=>tag==='video'?{readyState:2,videoWidth:800,videoHeight:600,play:async()=>{}}:{getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,dGVzdGU='}},
    setTimeout:fn=>{const id=++timerId;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),
    fetch:async(url,options={})=>{
      requests.push({url,...options,body:options.body?JSON.parse(options.body):null});
      if(config.fetch){const custom=await config.fetch(url,options);if(custom)return custom;}
      let response={};let status=200;
      if(url==='/mock/assistente-contas-anuncios')response=options.method==='PUT'?{sucesso:true}:{rascunho:config.draft||null};
      else if(url.endsWith('/capacidades'))response={capacidades:config.capacidades||{}};
      else if(url.endsWith('/conexoes')){response={conexoes:config.conexoes||[]};status=config.connectionError?500:200;}
      else if(url.endsWith('/status-completo')){response=config.status||{};status=config.statusError?500:200;}
      return {ok:status<400,status,json:async()=>response};
    }
  });
  vm.runInContext(codigo,context);
  return {window,storage,requests,alerts,elements,track,async open(){window.abrirAssistenteContasAnuncios();await flush();},async runTimers(){const batch=[...timers.values()];timers.clear();for(const fn of batch)fn();await flush();},html:()=>elements.get('assistente_contas_corpo').innerHTML};
}
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
