/* Identificação e filtro read-only do WhatsApp que RECEBEU o contato.
 * Não confundir telefone do cliente com número da empresa.
 * Dados vêm de whatsapp_conversas/whatsapp_numeros vinculados ao lead. */
(function(root){
"use strict";
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g, ch=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[ch]);
const digitos=value=>String(value||"").replace(/\D/g,"");
function receptores(lead) {
  const dados=Array.isArray(lead?.numeros_whatsapp_recebedores)?
    lead.numeros_whatsapp_recebedores:[];
  const vistos=new Set();
  return dados.filter(r=>{
    const id=String(r?.phone_number_id||"");
    if(!id||vistos.has(id))return false;
    vistos.add(id);
    return true;
  }).map(r=>({
    id:String(r.phone_number_id),numero:digitos(r.numero),
    nome:String(r.nome||"WhatsApp")
  }));
}
function corresponde(lead,selecionado){
  if(!selecionado)return true;
  if(selecionado==="sem_identificacao")return receptores(lead).length===0;
  return receptores(lead).some(r=>r.id===selecionado);
}
function etiqueta(r) {
 const final=r.numero?r.numero.slice(-4):"sem número";
 return "WhatsApp "+final+(r.nome&&r.nome!=="WhatsApp"?" · "+r.nome:"");
}
function badges(lead){
  return receptores(lead).map(r=>'<span class="lead-receptor-badge" title="Número da empresa que recebeu esta conversa">'+
    '📱 Recebido no '+escapeHtml(etiqueta(r))+'</span>').join("");
}
function textoExportacao(lead){
 return receptores(lead).map(etiqueta).join(" | ");
}
function popularFiltro(select,numeros,leads){
 if(!select)return;
 const atual=select.value;
 let opts=Array.isArray(numeros)?numeros:[];
 const fallback=[];
 for(const lead of leads||[])for(const r of receptores(lead))
   fallback.push({phone_number_id:r.id,numero:r.numero,nome:r.nome});
 // Conserva números já vistos em leads caso um número seja desconectado.
 const mapa=new Map();
 for(const n of [...opts,...fallback]) {
   const id=String(n?.phone_number_id||"");
   if(!id||mapa.has(id))continue;
   mapa.set(id,{id,numero:digitos(n.numero),nome:String(n.nome||"WhatsApp")});
 }
 select.innerHTML='<option value="">Todos os números</option>'+
  [...mapa.values()].map(n=>'<option value="'+escapeHtml(n.id)+'">'+
    escapeHtml(etiqueta(n))+'</option>').join("")+
  '<option value="sem_identificacao">Sem número identificado</option>';
 if(atual==="sem_identificacao"||mapa.has(atual))select.value=atual;
 else select.value="";
 // O filtro é relevante para usuários com múltiplos números ou com mensagens
 // recebidas no WhatsApp. Não escondê-lo só por haver zero leads num número.
 const field=select.closest(".leads-filter-field");
 if(field)field.hidden=mapa.size===0;
}
root.LeadsWhatsappReceptorUI={receptores,corresponde,etiqueta,badges,
  textoExportacao,popularFiltro};
})(typeof window!=="undefined"?window:globalThis);
