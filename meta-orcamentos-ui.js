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
let observer=null, mutation=null, editorId=null, handlerOrcamento=null;

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
 const linhas=resumo.sets.map(x=>{
   const identificador=x.numero_whatsapp
     ? "WhatsApp "+String(x.numero_whatsapp).replace(/\D/g,"").slice(-4)
     : (x.nome||"Conjunto");
   const descricao=x.nome||identificador;
   return '<span class="meta-budget-line"><span title="'+esc(descricao)+'">'+
     esc(identificador)+(ativo(x)?"":" (pausado)")+
     '</span><strong>'+brl(orcamento(x))+'</strong></span>';
 }).join("");
 metas.forEach(el=>{
   el.innerHTML='<span class="meta-budget-main">'+brl(principal)+'</span>'+
     '<small>'+(cbo?"Orçamento diário CBO":"Total/dia dos conjuntos ativos")+'</small>'+
     '<div class="meta-budget-lines">'+linhas+'</div>'+
     (!cbo&&resumo.all!==resumo.active?'<small>Configurado em todos: '+brl(resumo.all)+'</small>':"");
   el.title="Consulta dos orçamentos de conjuntos da Meta. Para editar, abra Editar campanha.";
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
    '<p class="meta-budget-total-aviso">O total a distribuir é definido no campo <strong>Orçamento diário (R$)</strong> logo acima. Selecione os conjuntos e escolha a forma de divisão.</p>'+
    '<label>Como distribuir<select name="modo" onchange="window.MetaOrcamentosUI.recalcular(this.form)">'+
    '<option value="igual">Dividir igualmente entre os selecionados</option>'+
    '<option value="manual">Definir o valor de cada conjunto</option></select></label>'+
    '<div class="meta-budget-choices">'+checkbox+'</div>'+
    '<div class="meta-budget-previsao" role="status"></div>'+
    '<button type="submit" class="meta-budget-btn">Revisar e aplicar na Meta</button>'+
    '<p class="meta-budget-disclaimer">Apenas orçamentos mudam; os conjuntos e anúncios mantêm seus status atuais. Nenhum valor será salvo sem sua confirmação.</p>'+
    '</form></details>';
}

// O card exibe dados somente de leitura. As ações são montadas na edição da campanha.
function atualizar(id,dados,alvo) {
 estados.set(Number(id),dados);
 banner(id,dados);
 if(editorId===Number(id)) montarGestaoEdicao(Number(id),dados);
}

function montarGestaoEdicao(id,dados) {
 if(editorId!==Number(id))return;
 const destino=document.getElementById("meta-edicao-gestao-conjuntos");
 if(!destino)return;
 const resumo=estadoResumo(dados);
 const cbo=Boolean(dados.campanha?.cbo);
 destino.innerHTML='<div class="meta-edicao-gestao-titulo">Conjuntos de anúncios</div>'+
   '<div class="meta-edicao-gestao-resumo">'+
   (cbo? 'Orçamento diário da campanha (CBO): '+brl(dados.campanha?.orcamento_diario_centavos):
     'Total diário dos conjuntos ativos (ABO): '+brl(resumo.active))+
   '</div>'+
   '<div class="meta-edicao-gestao-lista">'+resumo.sets.map(c=>
     '<div class="meta-edicao-gestao-linha"><span>'+esc(c.nome||"Conjunto")+
     (ativo(c)?' <small>Ativo</small>':' <small>Pausado</small>')+
     '</span><strong>'+brl(orcamento(c))+'/dia</strong></div>').join("")+
   '</div>'+
   '<div id="meta-edicao-form-orcamento"></div>'+
   '<div class="meta-conjuntos-edicao" data-campanha-id="'+id+'"></div>';
 const formOrcamento=destino.querySelector("#meta-edicao-form-orcamento");
 if(!cbo&&resumo.sets.length){
   const entrada=document.getElementById("orcamento");
   if(entrada&&!entrada.dataset.metaBudgetTotalInicializado){
     entrada.value=((resumo.active||resumo.all)/100).toFixed(2);
     entrada.dataset.metaBudgetTotalInicializado="1";
   }
   const wrapper=document.createElement("div");
   wrapper.innerHTML=linhasOrcamento(dados);
   formOrcamento.appendChild(wrapper.firstElementChild);
   const form=formOrcamento.querySelector("form");
   if(form){form.dataset.campanhaId=String(id);recalcular(form);}
 } else if(cbo) {
   formOrcamento.textContent="Nesta campanha o orçamento é controlado na campanha (CBO); não há distribuição individual por conjunto.";
 }
 // Mesmo em CBO, permite criar conjunto pausado com anúncio e sem orçamento separado.
 window.MetaConjuntosUI?.renderizarGestao(destino.querySelector(".meta-conjuntos-edicao"),id,dados);
}

async function recarregarEdicao(id) {
 if(Number(editorId)!==Number(id))return;
 estados.delete(Number(id));
 const entrada=document.getElementById("orcamento");
 if(entrada)delete entrada.dataset.metaBudgetTotalInicializado;
 const dados=await buscar(id,true);
 if(Number(editorId)===Number(id))montarGestaoEdicao(Number(id),dados);
 const details=document.querySelector(".meta-conjuntos-campanha[data-campanha-id='"+Number(id)+"']");
 if(details?.open)await window.MetaConjuntosUI?.carregar(details,Number(id));
}

function calcular(form) {
 const id=Number(form.dataset.campanhaId);
 const dados=estados.get(id);
 if(!dados)throw new Error("Reabra o painel para consultar os dados atuais.");
 const selecionados=[...form.querySelectorAll("input[data-selecionado]:checked")].map(x=>texto(x.value));
 if(!selecionados.length)throw new Error("Escolha pelo menos um conjunto.");
 const total=centavos(document.getElementById("orcamento")?.value);
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
 const total=centavos(document.getElementById("orcamento")?.value);
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
  await recarregarEdicao(plano.id);
 }catch(err){
  alert("Não foi possível concluir a distribuição. "+texto(err.message)+
    "\nConfira os orçamentos na Meta antes de repetir.");
  estados.delete(plano.id);
 }finally{
  form.dataset.enviando="0";btn.disabled=false;
 }
}

function abrir(id) {
 if(editorId===Number(id)) {
   document.getElementById("meta-edicao-gestao-conjuntos")?.scrollIntoView({behavior:"smooth",block:"nearest"});
   return;
 }
 alert("Para criar conjuntos ou distribuir orçamento, abra Editar campanha e vá ao campo Orçamento diário.");
}

function editorIndicacao(campanha) {
 const plataforma=String(campanha?.plataforma||"meta").toLowerCase();
 if(!["meta","facebook","instagram"].includes(plataforma)||!campanha?.campaign_id) {
   resetarEditor();
   return;
 }
 editorId=Number(campanha?.id)||null;
 const campo=document.getElementById("orcamento");
 if(!campo||!editorId)return;
 // Até consultar a Meta, impede que o formulário legado sobrescreva o orçamento
 // de um único conjunto enquanto o usuário pensa editar o total da campanha.
 campo.readOnly=true;
 campo.title="O orçamento ABO deve ser editado nos conjuntos logo abaixo deste campo.";
 let nota=document.getElementById("meta-edicao-orcamento-nota");
 if(!nota){
   nota=document.createElement("div");
   nota.id="meta-edicao-orcamento-nota";
   nota.className="meta-edicao-orcamento-nota";
   campo.insertAdjacentElement("afterend",nota);
 }
 nota.textContent="Consultando orçamento e conjuntos atuais na Meta...";
 let gestao=document.getElementById("meta-edicao-gestao-conjuntos");
 if(!gestao){
   gestao=document.createElement("section");
   gestao.id="meta-edicao-gestao-conjuntos";
   gestao.className="meta-edicao-gestao";
   const raiz=campo.closest("#bloco_orcamento") || campo.parentElement;
   raiz.appendChild(gestao);
 }
 const infoNovo=document.getElementById("meta-orcamento-criacao-ajuda");
 if(infoNovo)infoNovo.hidden=true;
 const solicitado=editorId;
 // Não exibe valores de cache ao entrar no editor: a Meta deve ser fonte atual.
 buscar(editorId,true).then(d=>{
   if(editorId!==solicitado)return;
   if(d.campanha?.cbo){
     campo.readOnly=false;
     campo.title="CBO: orçamento centralizado na campanha.";
     nota.textContent="Campanha CBO: o orçamento é controlado no nível da campanha. Conjuntos adicionais podem ser criados abaixo.";
   }else{
     const resumo=estadoResumo(d);
     campo.readOnly=false;
     campo.dataset.metaAboConjuntos="1";
     campo.title="ABO: valor TOTAL para distribuir entre os conjuntos selecionados abaixo. Somente o botão Aplicar na Meta modifica os valores.";
     nota.textContent="ABO: atual nos conjuntos ativos "+brl(resumo.active)+
       ". Defina o total neste campo e distribua abaixo. Salvar a campanha não aplica a distribuição; use o botão específico da Meta.";
     if(handlerOrcamento)campo.removeEventListener("input",handlerOrcamento);
     handlerOrcamento=()=>{
       const form=document.querySelector("#meta-edicao-gestao-conjuntos .meta-budget-form");
       if(form)recalcular(form);
     };
     campo.addEventListener("input",handlerOrcamento);
   }
   montarGestaoEdicao(solicitado,d);
 }).catch(err=>{
   if(editorId!==solicitado)return;
   nota.textContent="Não foi possível carregar os conjuntos da Meta. Edição de orçamento bloqueada por segurança: "+texto(err.message);
   gestao.innerHTML='<p>Reabra a edição após restabelecer a conexão com a Meta.</p>';
 });
}
function bloquearBudgetEditor(id){
 const campo=document.getElementById("orcamento");
 return Number(editorId)===Number(id)&&Boolean(campo?.readOnly||campo?.dataset.metaAboConjuntos==="1");
}
function resetarEditor(){
 const campo=document.getElementById("orcamento");
 if(campo){
   campo.readOnly=false;
   delete campo.dataset.metaAboConjuntos;
   delete campo.dataset.metaBudgetTotalInicializado;
   if(handlerOrcamento){campo.removeEventListener("input",handlerOrcamento);handlerOrcamento=null;}
 }
 const nota=document.getElementById("meta-edicao-orcamento-nota");
 if(nota)nota.remove();
 document.getElementById("meta-edicao-gestao-conjuntos")?.remove();
 const infoNovo=document.getElementById("meta-orcamento-criacao-ajuda");
 if(infoNovo)infoNovo.hidden=false;
 editorId=null;
}

function atualizarAjudaCriacao(metaAtiva) {
 const nota=document.getElementById("meta-orcamento-criacao-ajuda");
 if(nota)nota.hidden=!(metaAtiva && !editorId);
}

function observar(){
 if(!observer&&"IntersectionObserver" in window){
  observer=new IntersectionObserver(es=>es.forEach(x=>{
    if(x.isIntersecting){observer.unobserve(x.target);carregarBanner(x.target);}
  }),{rootMargin:"250px"});
 }
 if(typeof redesSelecionadasCampanha!=="undefined") {
   atualizarAjudaCriacao((redesSelecionadasCampanha.has("facebook")||redesSelecionadasCampanha.has("instagram"))&&!campanhaEmEdicao);
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
window.MetaOrcamentosUI={atualizar,recalcular,salvar,abrir,editorIndicacao,bloquearBudgetEditor,resetarEditor,recarregarEdicao,atualizarAjudaCriacao};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",observar,{once:true});
else observar();
})();
