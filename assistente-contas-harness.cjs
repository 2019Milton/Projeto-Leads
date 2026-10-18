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
  return {context,window,storage,requests,alerts,elements,track,async open(){window.abrirAssistenteContasAnuncios();await flush();},async runTimers(){const batch=[...timers.values()];timers.clear();for(const fn of batch)fn();await flush();},html:()=>elements.get('assistente_contas_corpo').innerHTML};
}
module.exports = {app,flush,dados,token};
