/* Painel read-only: CRM × referência de anúncio da Meta. Nada é alterado. */
(function(){
"use strict";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({
 "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[c]);
const brl=v=>v==null||!Number.isFinite(Number(v))?"—":
 new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v));
const numero=v=>new Intl.NumberFormat("pt-BR").format(Number(v)||0);
const api=()=>typeof API!=="undefined"?API:
 window.API||"https://api.plataformadeleads.com.br";
const token=()=>localStorage.getItem("token")||"";
let emAndamento=false;
let campanhasCarregadas=false;
let campanhas=[];
let ultimo=[];
function htmlBase(){
 return '<details class="meta-distribuicao" ontoggle="window.MetaDistribuicaoUI.abrir(this)">'+
 '<summary><span>📊 Distribuição de Leads por Conjunto e WhatsApp</span><span class="meta-dist-chevron">▼</span></summary>'+
 '<div class="meta-dist-body">'+
  '<p class="meta-dist-intro">Leads registrados no CRM, separados pelo WhatsApp que recebeu a conversa e pelo anúncio de origem identificado. Sem contagens estimadas.</p>'+
  '<div class="meta-dist-filtros">'+
   '<label>Campanha<select class="meta-dist-campanha" onchange="window.MetaDistribuicaoUI.carregar(this.closest(\'.meta-distribuicao\'))">'+
    '<option value="">Carregando campanhas…</option></select></label>'+
   '<label>Período<select class="meta-dist-periodo" onchange="window.MetaDistribuicaoUI.trocarPeriodo(this.closest(\'.meta-distribuicao\'))">'+
    '<option value="hoje">Hoje</option><option value="ontem">Ontem</option>'+
    '<option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option>'+
    '<option value="personalizado">Personalizado</option></select></label>'+
   '<label class="meta-dist-data" hidden>De<input type="date" class="meta-dist-inicio"></label>'+
   '<label class="meta-dist-data" hidden>Até<input type="date" class="meta-dist-fim"></label>'+
   '<button type="button" class="meta-dist-atualizar" onclick="window.MetaDistribuicaoUI.carregar(this.closest(\'.meta-distribuicao\'))">↻ Atualizar resultados</button>'+
  '</div>'+
  '<div class="meta-dist-estado" role="status" aria-live="polite">Abra a seção para carregar o relatório.</div>'+
  '<div class="meta-dist-resultados"></div>'+
 '</div></details>';
}
async function getJSON(path){
 const r=await fetch(api()+path,{headers:{Authorization:"Bearer "+token()}});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data.error||
  "Não foi possível consultar os dados (HTTP "+r.status+").");
 return data;
}
function setEstado(painel,estado,mensagem){
 const el=painel.querySelector(".meta-dist-estado");
 if(!el)return;
 el.dataset.estado=estado;
 el.textContent=mensagem;
}
function trocarPeriodo(painel){
 if(!painel)return;
 const custom=painel.querySelector(".meta-dist-periodo").value==="personalizado";
 painel.querySelectorAll(".meta-dist-data").forEach(x=>x.hidden=!custom);
 if(!custom)carregar(painel);
}
function renderizar(painel,data){
 const target=painel.querySelector(".meta-dist-resultados");
 if(!target)return;
 const valores=Array.isArray(data.numeros)?data.numeros:[];
 const conjuntos=Array.isArray(data.conjuntos)?data.conjuntos:[];
 const periodo=data.periodo||{};
 const numeroCards=valores.map(n=>
  '<article class="meta-dist-numero">'+
    '<header><span>📱 WhatsApp '+esc(String(n.numero||"").slice(-4))+'</span>'+
      '<small>'+esc(n.nome)+'</small></header>'+
    '<strong class="meta-dist-lead-grande">'+numero(n.leads)+'</strong>'+
    '<small>Leads no CRM vinculados a esta campanha</small>'+
    '<div class="meta-dist-numero-pares"><span>Atribuídos a conjunto</span><b>'+numero(n.atribuidos)+'</b></div>'+
    '<div class="meta-dist-numero-pares"><span>Sem conjunto identificado</span><b>'+numero(n.sem_conjunto)+'</b></div>'+
  '</article>'
 ).join("");
 const setCards=conjuntos.map(c=>{
  const ultimos=String(c.numero||"").replace(/\D/g,"").slice(-4);
  const gasto=c.gasto_reais==null?'<span class="meta-dist-indisponivel">Indisponível</span>':brl(c.gasto_reais);
  const cpl=c.custo_por_lead==null?'<span class="meta-dist-indisponivel">—</span>':brl(c.custo_por_lead);
  return '<article class="meta-dist-conjunto">'+
   '<div class="meta-dist-conjunto-titulo"><strong>'+esc(c.nome||"Conjunto")+'</strong>'+
    '<span class="meta-dist-estado-conjunto">'+esc(String(c.status||"").toUpperCase()==="ACTIVE"?"Ativo":String(c.status||"Pausado"))+'</span></div>'+
   '<small>WhatsApp '+(ultimos?esc(ultimos):"não identificado")+
    ' · Orçamento '+brl((Number(c.orcamento_centavos)||0)/100)+'/dia</small>'+
   '<div class="meta-dist-metricas">'+
    '<div><b>'+numero(c.leads)+'</b><small>Leads atribuídos</small></div>'+
    '<div><b>'+gasto+'</b><small>Gasto no período (Meta)</small></div>'+
    '<div><b>'+cpl+'</b><small>Custo por lead (CRM)</small></div>'+
   '</div></article>';
 }).join("");
 target.innerHTML=
  '<div class="meta-dist-referencia">Período: '+esc(periodo.inicio||"")+" a "+esc(periodo.fim||"")+
   ' · Atualizado: '+esc(new Date(data.atualizado_em).toLocaleString("pt-BR"))+'</div>'+
  '<div class="meta-dist-resumo">'+
   '<div><strong>'+numero(data.total_leads)+'</strong><small>Leads da campanha no CRM</small></div>'+
   '<div><strong>'+numero(data.leads_atribuidos)+'</strong><small>Com conjunto identificado</small></div>'+
   '<div><strong>'+numero(data.sem_conjunto)+'</strong><small>Sem conjunto identificado</small></div>'+
  '</div>'+
  '<h5>Por WhatsApp</h5>'+
  (numeroCards?'<div class="meta-dist-grade">'+numeroCards+'</div>':
    '<p class="meta-dist-vazio">Nenhum lead vinculado a WhatsApp nesta campanha e período.</p>')+
  '<h5>Por conjunto de anúncios</h5>'+
  (setCards?'<div class="meta-dist-conjuntos">'+setCards+'</div>':
    '<p class="meta-dist-vazio">Nenhum conjunto de anúncios retornado pela Meta.</p>')+
  (data.parcial?'<p class="meta-dist-aviso-parcial">⚠️ Relatório parcial: '+esc(data.aviso_meta||"Dados Meta indisponíveis")+
    ' · A contagem por WhatsApp considera apenas leads já vinculados à campanha no CRM; conjuntos, custos e atribuições podem estar incompletos.</p>':'')+
  '<p class="meta-dist-legenda"><strong>Como contamos:</strong> contato distinto registrado no CRM e vinculado a uma conversa WhatsApp. A atribuição ao conjunto só ocorre quando o ID do anúncio enviado pela Meta corresponde ao anúncio daquele conjunto. Contatos de outras campanhas não entram. Leads sem referência reconhecida ficam separados. Gasto é o valor do Insights, não o orçamento; o CPL só é exibido se há gasto e leads atribuídos.</p>'+
  '<p class="meta-dist-legenda">O total “Leads hoje” no topo do Status Meta inclui outras origens e pode ser diferente deste relatório.</p>';
}
async function abrir(painel){
 if(!painel?.open||painel.dataset.inicializado==="1")return;
 painel.dataset.inicializado="1";
 setEstado(painel,"aviso","Carregando campanhas vinculadas à conta Meta...");
 try{
  const data=await getJSON("/meta/distribuicao-leads/campanhas");
  campanhas=Array.isArray(data.campanhas)?data.campanhas:[];
  campanhasCarregadas=true;
  const select=painel.querySelector(".meta-dist-campanha");
  const atual=select.value;
  select.innerHTML='<option value="">Selecione a campanha</option>'+
   campanhas.map(c=>'<option value="'+Number(c.id)+'">'+esc(c.nome)+'</option>').join("");
  if(campanhas.length){
   select.value=campanhas.some(x=>String(x.id)===atual)?atual:String(campanhas[0].id);
   await carregar(painel);
  }else{
   setEstado(painel,"aviso",data.conectado===false?
     "Conecte uma conta de anúncios Meta para acompanhar a distribuição.":
     "Nenhuma campanha Meta encontrada nesta conta.");
  }
 }catch(e){
  painel.dataset.inicializado="0";
  setEstado(painel,"erro",e.message||"Falha ao listar campanhas.");
 }
}
async function carregar(painel){
 if(!painel||emAndamento)return;
 const campanha=painel.querySelector(".meta-dist-campanha")?.value;
 const periodo=painel.querySelector(".meta-dist-periodo")?.value||"hoje";
 if(!/^\d+$/.test(campanha||"")){
  setEstado(painel,"aviso","Selecione uma campanha para consultar os leads.");return;
 }
 const params=new URLSearchParams({campanha_id:campanha,periodo});
 if(periodo==="personalizado"){
  const ini=painel.querySelector(".meta-dist-inicio")?.value;
  const fim=painel.querySelector(".meta-dist-fim")?.value;
  if(!ini||!fim){
   setEstado(painel,"aviso","Escolha as datas inicial e final e clique em Atualizar resultados.");return;
  }
  params.set("inicio",ini);params.set("fim",fim);
 }
 emAndamento=true;
 painel.querySelector(".meta-dist-atualizar").disabled=true;
 setEstado(painel,"aviso","Consultando referências dos anúncios na Meta e leads do CRM...");
 try{
  const data=await getJSON("/meta/distribuicao-leads?"+params);
  renderizar(painel,data);
  setEstado(painel,data.parcial?"aviso":"sucesso",
   data.parcial?"Dados do CRM carregados parcialmente. Veja o aviso sobre a indisponibilidade da Meta.":
   "Relatório atualizado. Os totais vêm do CRM; o gasto vem da Meta quando disponível.");
 }catch(e){
  setEstado(painel,"erro",e.message||"Erro ao atualizar a distribuição.");
  // Resultados antigos não podem ser apresentados como se fossem atuais.
  painel.querySelector(".meta-dist-resultados").innerHTML="";
 }finally{
  painel.querySelector(".meta-dist-atualizar").disabled=false;emAndamento=false;
 }
}
window.MetaDistribuicaoUI={htmlBase,abrir,carregar,trocarPeriodo};
})();
