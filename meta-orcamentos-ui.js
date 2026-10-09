/* Visão de orçamento da Meta no card e editor. Mutações somente após confirmação. */
(function(){
"use strict";
const estados=new Map();
const texto=x=>String(x===null||x===undefined?"":x);
const esc=x=>texto(x).replace(/[&<>"']/g,k=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[k]));
const brl=c=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format((Number(c)||0)/100);
const centavos=x=>Math.round(Number(x)*100);
const token=()=>localStorage.getItem("token")||"";
const url=id=>API+"/meta/campanhas/"+Number(id)+"/conjuntos";
let observer=null, mutation=null, editorId=null;

const orcamento=x=>Number(x?.orcamento_diario_centavos)||0;
const ativo=x=>String(x?.status_efetivo||x?.status)==="ACTIVE";
const estadoResumo=d=>{
 const sets=(d.conjuntos||[]);
 const all=sets.reduce((s,x)=>s+orcamento(x),0);
 const active=sets.filter(ativo).reduce((s,x)=>s+orcamento(x),0);
 return {all,active,sets, campanha:d.campanha||{}};
};

function banner(id,dados) {
 const resumo=estadoResumo(dados),metas=document.querySelectorAll(".meta-orcamento-banner[data-campanha-id='"+Number(id)+"']");
 const cbo=Boolean(resumo.campanha.cbo);
 const principal=cbo?Number(resumo.campanha.orcamento_diario_centavos)||0:resumo.active;
 const linhas=resumo.sets.map(x=>
  '<span class="meta-budget-line"><span>'+esc(x.nome||"Conjunto")+
  (ativo(x)?"":" (pausado)")+'</span><strong>'+brl(orcamento(x))+'</strong></span>'
 ).join("");
 metas.forEach(el=>{
   el.innerHTML='<span class="meta-budget-main">'+brl(principal)+'</span>'+
     '<small>'+(cbo?"Orçamento diário CBO":"Total/dia dos conjuntos ativos")+'</small>'+
     '<div class="meta-budget-lines">'+linhas+'</div>'+
     (!cbo&&resumo.all!==resumo.active?'<small>Configurado em todos: '+brl(resumo.all)+'</small>':"");
   el.title="Valores atuais consultados diretamente na Meta. Toque para gerenciar os conjuntos.";
 });
}
async function buscar(id,forcar=false) {
 if(!forcar&&estados.has(Number(id)))return estados.get(Number(id));
 const r=await fetch(url(id),{headers:{Authorization:"Bearer "+token()}});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data.error||"Consulta de orçamento Meta indisponível");
 estados.set(Number(id),data);
 banner(id,data);
 return data;
}
async function carregarBanner(el) {
 const id=Number(el.dataset.campanhaId);
 if(!id||el.dataset.consultado==="1")return;
 el.dataset.consultado="1";
 try{await buscar(id);}
 catch(e){
   el.innerHTML='<span>Verificar na Meta</span><small>Orçamento por conjunto</small>';
   el.title=texto(e.message);
 }
}

function linhasOrcamento(d) {
 const soma=estadoResumo(d);
 const checkbox=soma.sets.map((x,i)=>{
  const checked=ativo(x)?" checked":"";
  return '<div class="meta-budget-choice" data-budget-id="'+esc(x.id)+'">'+
    '<label><input type="checkbox" data-selecionado value="'+esc(x.id)+'"'+checked+
    ' onchange="window.MetaOrcamentosUI.recalcular(this.form)">'+
    '<span>'+esc(x.nome||"Conjunto "+(i+1))+' <small>'+(ativo(x)?"Ativo":"Pausado")+
    ' — hoje '+brl(orcamento(x))+'</small></span></label>'+
    '<input type="number" data-valor name="valor_'+esc(x.id)+'" step="0.01" min="15" value="'+(orcamento(x)/100).toFixed(2)+
    '" onchange="window.MetaOrcamentosUI.recalcular(this.form)" aria-label="Orçamento de '+esc(x.nome||"conjunto")+'"></div>';
 }).join("");
 const totalInicial=soma.active>0?soma.active:soma.all;
 return '<details class="meta-budget-editor" onclick="event.stopPropagation()">'+
    '<summary>Editar orçamento e distribuir entre conjuntos</summary>'+
    '<form class="meta-budget-form" onsubmit="window.MetaOrcamentosUI.salvar(event,this)">'+
    '<p>Selecione os conjuntos que receberão valores novos. Conjuntos não selecionados não serão alterados, incluindo os pausados.</p>'+
    '<label>Valor total a distribuir por dia (R$)'+
    '<input name="total" type="number" min="15" step="0.01" required value="'+(totalInicial/100).toFixed(2)+
    '" oninput="window.MetaOrcamentosUI.recalcular(this.form)"></label>'+
    '<label>Como distribuir<select name="modo" onchange="window.MetaOrcamentosUI.recalcular(this.form)">'+
    '<option value="igual">Dividir igualmente entre os selecionados</option>'+
    '<option value="manual">Definir o valor de cada conjunto</option></select></label>'+
    '<div class="meta-budget-choices">'+checkbox+'</div>'+
    '<div class="meta-budget-previsao" role="status"></div>'+
    '<button type="submit" class="meta-budget-btn">Revisar e aplicar na Meta</button>'+
    '<p class="meta-budget-disclaimer">Apenas orçamentos mudam; os conjuntos e anúncios mantêm seus status atuais. Nenhum valor será salvo sem sua confirmação.</p>'+
    '</form></details>';
}

function atualizar(id,dados,alvo) {
 estados.set(Number(id),dados);
 banner(id,dados);
 const destino=alvo||document.querySelector(".meta-conjuntos-campanha[data-campanha-id='"+Number(id)+"'] .meta-conj-conteudo");
 if(!destino)return;
 destino.querySelectorAll(".meta-budget-editor").forEach(x=>x.remove());
 if(dados.campanha?.cbo)return;
 const wrapper=document.createElement("div");
 wrapper.innerHTML=linhasOrcamento(dados);
 const painel=wrapper.firstElementChild;
 const resumo=destino.querySelector(".meta-conj-resumo");
 if(resumo)resumo.insertAdjacentElement("afterend",painel);
 else destino.prepend(painel);
 const form=painel.querySelector("form");
 if(form){form.dataset.campanhaId=String(id);recalcular(form);}
}

function calcular(form) {
 const id=Number(form.dataset.campanhaId);
 const dados=estados.get(id);
 if(!dados)throw new Error("Reabra o painel para consultar os dados atuais.");
 const selecionados=[...form.querySelectorAll("input[data-selecionado]:checked")].map(x=>texto(x.value));
 if(!selecionados.length)throw new Error("Escolha pelo menos um conjunto.");
 const total=centavos(form.elements.namedItem("total").value);
 if(!Number.isSafeInteger(total)||total<1500)throw new Error("Informe um total diário válido a partir de R$ 15.");
 const todos=dados.conjuntos||[];
 const somaAtual=estadoResumo(dados);
 const modo=texto(form.elements.namedItem("modo").value);
 const base=Math.floor(total/selecionados.length),resto=total%selecionados.length;
 const itens=selecionados.map((idSet,i)=>{
   const atual=todos.find(x=>texto(x.id)===idSet);
   if(!atual)throw new Error("Conjunto não encontrado. Atualize a consulta.");
   const novo=modo==="manual"?centavos(form.elements.namedItem("valor_"+idSet).value):
     base+(i<resto?1:0);
   if(!Number.isSafeInteger(novo)||novo<1500)throw new Error("O orçamento de cada conjunto deve ser no mínimo R$ 15/dia.");
   return {id:idSet,centavos:novo,esperado_centavos:orcamento(atual),esperado_status:atual.status};
 });
 const soma=itens.reduce((s,x)=>s+x.centavos,0);
 if(soma!==total)throw new Error("Os valores dos conjuntos precisam somar exatamente "+brl(total)+". Atual: "+brl(soma)+".");
 const antes=somaAtual.active;
 let depois=antes;
 itens.forEach(x=>{
  const c=todos.find(t=>texto(t.id)===x.id);
  if(ativo(c))depois+=x.centavos-orcamento(c);
 });
 return {itens,total_centavos:total,antes, depois,id,modo};
}

function recalcular(form){
 if(!form)return;
 const aviso=form.querySelector(".meta-budget-previsao");
 const campoModo=form.elements.namedItem("modo");
 const manual=campoModo?.value==="manual";
 const selecoes=[...form.querySelectorAll(".meta-budget-choice")];
 const ativos=selecoes.filter(w=>w.querySelector("[data-selecionado]")?.checked);
 const total=centavos(form.elements.namedItem("total").value);
 const base=Math.floor(total/Math.max(1,ativos.length)),resto=total%Math.max(1,ativos.length);
 let i=0;
 selecoes.forEach(w=>{
  const check=w.querySelector("[data-selecionado]");
  const valor=w.querySelector("[data-valor]");
  const ok=check.checked;
  valor.disabled=!ok||!manual;
  valor.style.opacity=ok?1:.45;
  if(ok&&!manual&&Number.isSafeInteger(total))valor.value=((base+(i<resto?1:0))/100).toFixed(2);
  if(ok)i++;
 });
 try{
  const plano=calcular(form);
  aviso.classList.remove("meta-budget-invalido");
  aviso.innerHTML='Total selecionado: <strong>'+brl(plano.total_centavos)+'</strong><br>'+
    'Total dos conjuntos ativos antes: '+brl(plano.antes)+'<br>'+
    'Total diário dos ativos após aplicar: <strong>'+brl(plano.depois)+'</strong>';
  form.querySelector("button[type=submit]").disabled=false;
 }catch(e){
  aviso.classList.add("meta-budget-invalido");
  aviso.textContent=texto(e.message);
  form.querySelector("button[type=submit]").disabled=true;
 }
}

async function salvar(e,form){
 e.preventDefault();e.stopPropagation();
 if(form.dataset.enviando==="1")return;
 let plano;
 try{plano=calcular(form);}catch(err){alert(texto(err.message));return;}
 const dados=estados.get(plano.id),porId=new Map((dados.conjuntos||[]).map(c=>[texto(c.id),c]));
 const detalhes=plano.itens.map(x=>{
  const c=porId.get(x.id);
  return (c?.nome||"Conjunto "+x.id)+": "+brl(x.esperado_centavos)+" → "+brl(x.centavos)+
    (ativo(c)?" [ativo]":" [pausado]");
 }).join("\n");
 const ok=confirm("Confirmar alteração dos orçamentos na Meta?\n\n"+
   detalhes+"\n\nTotal selecionado: "+brl(plano.total_centavos)+
   "\nTotal diário dos conjuntos ativos após: "+brl(plano.depois)+
   "\n\nOs conjuntos NÃO selecionados e os status NÃO serão modificados.");
 if(!ok)return;
 const btn=form.querySelector("button[type=submit]");
 form.dataset.enviando="1";btn.disabled=true;
 try{
  const r=await fetch(url(plano.id)+"/distribuir-orcamento",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token()},
    body:JSON.stringify({itens:plano.itens,total_centavos:plano.total_centavos})
  });
  const result=await r.json().catch(()=>({}));
  if(!r.ok||!result.ok)throw new Error(result.error||"Meta não confirmou todos os orçamentos.");
  alert("Orçamentos atualizados na Meta. Conjuntos alterados: "+result.alterados+".");
  estados.delete(plano.id);
  const details=document.querySelector(".meta-conjuntos-campanha[data-campanha-id='"+plano.id+"']");
  if(details&&window.MetaConjuntosUI)await window.MetaConjuntosUI.carregar(details,plano.id);
  else await buscar(plano.id,true);
 }catch(err){
  alert("Não foi possível concluir a distribuição. "+texto(err.message)+
    "\nConfira os orçamentos na Meta antes de repetir.");
  estados.delete(plano.id);
 }finally{
  form.dataset.enviando="0";btn.disabled=false;
 }
}

function abrir(id) {
 id=Number(id);
 const details=document.querySelector(".meta-conjuntos-campanha[data-campanha-id='"+id+"']");
 if(!details){alert("Abra o card da campanha para editar os conjuntos.");return;}
 details.open=true;
 details.scrollIntoView({behavior:"smooth",block:"center"});
 const conferir=()=>{const painel=details.querySelector(".meta-budget-editor");
   if(painel){painel.open=true;return true;}return false;};
 if(!conferir())setTimeout(conferir,1500);
}

function editorIndicacao(campanha) {
 editorId=Number(campanha?.id)||null;
 const campo=document.getElementById("orcamento");
 if(!campo||!editorId)return;
 campo.readOnly=true;
 campo.title="Orçamento Meta: consulte valores atuais por conjunto no card.";
 let nota=document.getElementById("meta-edicao-orcamento-nota");
 if(!nota){
   nota=document.createElement("div");
   nota.id="meta-edicao-orcamento-nota";
   nota.className="meta-edicao-orcamento-nota";
   campo.insertAdjacentElement("afterend",nota);
 }
 nota.innerHTML="Verificando orçamentos de conjuntos na Meta...";
 buscar(editorId).then(d=>{
   if(editorId!==Number(campanha.id))return;
   if(d.campanha?.cbo){
     campo.readOnly=false;nota.textContent="Campanha com orçamento centralizado (CBO).";return;
   }
   nota.innerHTML="Nesta campanha, o orçamento é definido por conjunto (ABO). "+
     "Para alterar valores, use "+
     '<button type="button" class="meta-budget-link" onclick="fecharEdicaoCampanha();window.MetaOrcamentosUI.abrir('+editorId+')">Distribuir orçamento entre conjuntos</button>.';
 }).catch(err=>{nota.textContent="Não foi possível verificar o orçamento na Meta. Evite alterar este campo até confirmar os valores.";});
}
function bloquearBudgetEditor(id){
 const campo=document.getElementById("orcamento");
 return Number(editorId)===Number(id)&&Boolean(campo?.readOnly);
}
function resetarEditor(){
 const campo=document.getElementById("orcamento");
 if(campo)campo.readOnly=false;
 const nota=document.getElementById("meta-edicao-orcamento-nota");
 if(nota)nota.remove();
 editorId=null;
}

function observar(){
 if(!observer&&"IntersectionObserver" in window){
  observer=new IntersectionObserver(es=>es.forEach(x=>{
    if(x.isIntersecting){observer.unobserve(x.target);carregarBanner(x.target);}
  }),{rootMargin:"250px"});
 }
 const scan=()=>document.querySelectorAll(".meta-orcamento-banner").forEach(x=>{
   if(x.dataset.visto==="1")return;
   x.dataset.visto="1";
   if(observer)observer.observe(x);else carregarBanner(x);
 });
 scan();
 if(!mutation){
  mutation=new MutationObserver(scan);
  mutation.observe(document.body,{childList:true,subtree:true});
 }
}
window.MetaOrcamentosUI={atualizar,recalcular,salvar,abrir,editorIndicacao,bloquearBudgetEditor,resetarEditor};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",observar,{once:true});
else observar();
})();
