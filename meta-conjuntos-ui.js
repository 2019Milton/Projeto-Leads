/* Gestão de conjuntos dentro do card Meta. Nunca cria ou ativa anúncios automaticamente. */
(function () {
  "use strict";
  const estados = new Map();
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const fmt = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
  const valorCentavos = v => fmt((Number(v)||0)/100);
  const numeroExibido = v => v ? "+" + String(v).replace(/\D/g,"") : "Não identificado pela Meta";
  const caminho = id => API + "/meta/campanhas/" + Number(id) + "/conjuntos";
  const token = () => localStorage.getItem("token") || "";
  const statusLabel = status => {
    const x = String(status||"").toUpperCase();
    if (x === "ACTIVE") return "Ativo";
    if (x === "PAUSED" || x === "CAMPAIGN_PAUSED" || x === "ADSET_PAUSED") return "Pausado";
    return x || "Não informado";
  };
  function exibirErro(dest, mensagem) {
    dest.innerHTML = '<div class="meta-conj-erro">' + esc(mensagem) + '</div>';
  }
  async function carregar(details, campanhaId) {
    const alvo = details && details.querySelector(".meta-conj-conteudo");
    if (!alvo || details.dataset.carregando === "1") return;
    details.dataset.carregando = "1";
    alvo.innerHTML = '<div class="meta-conj-carregando">Consultando conjuntos na Meta...</div>';
    try {
      const resposta = await fetch(caminho(campanhaId), {
        headers: {Authorization:"Bearer " + token()}
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.error || "Erro na consulta à Meta");
      estados.set(Number(campanhaId), dados);
      renderizar(alvo, campanhaId, dados);
      window.MetaOrcamentosUI?.atualizar(campanhaId,dados,alvo);
      const contador = details.querySelector(".meta-conj-contagem");
      if (contador) contador.textContent = (dados.conjuntos || []).length;
    } catch(e) {
      exibirErro(alvo, e.message || "Falha na conexão");
    } finally {
      details.dataset.carregando = "0";
    }
  }

  function htmlConjunto(x) {
    const m = x.metricas || {};
    const dinheiro = x.orcamento_diario_centavos > 0 ? valorCentavos(x.orcamento_diario_centavos) + "/dia" :
      x.orcamento_total_centavos > 0 ? valorCentavos(x.orcamento_total_centavos) + " total" : "Orçamento na campanha";
    const anuncios = (x.anuncios || []).map(a =>
      '<div class="meta-conj-anuncio">Anúncio: <strong>' + esc(a.nome || a.id) + '</strong> · ' +
      esc(statusLabel(a.status_efetivo || a.status)) + '</div>').join("");
    const nome = esc(x.nome || "Conjunto sem nome");
    return '<div class="meta-conj-item">' +
      '<div class="meta-conj-cabecalho"><strong>' + nome + '</strong><span class="meta-conj-status">' +
      esc(statusLabel(x.status_efetivo || x.status)) + '</span></div>' +
      '<div class="meta-conj-destino">WhatsApp: ' + esc(numeroExibido(x.numero_whatsapp)) +
      ' · ' + esc(x.destino || "Destino não informado") + '</div>' +
      '<div class="meta-conj-metricas"><span>Orçamento: ' + esc(dinheiro) +
      '</span><span>Gasto (30d): ' + fmt(m.gasto) + '</span><span>Cliques: ' +
      esc(m.cliques || 0) + '</span><span>Impressões: ' + esc(m.impressoes || 0) +
      '</span>' + (m.conversas_meta == null ? "" :
        '<span>Conversas (Meta): ' + esc(m.conversas_meta) + '</span>') + '</div>' +
      '<div class="meta-conj-anuncios">' + (anuncios || '<em>Sem anúncio neste conjunto</em>') + '</div>' +
      '</div>';
  }

  // Ações administrativas ficam exclusivamente na edição da campanha.
  function montarFormularioCriacao(conjuntos, campanha, campanhaId) {
    let s = '<details class="meta-conj-criar" onclick="event.stopPropagation()" ' +
      'ontoggle="if(this.open)window.MetaConjuntosUI.carregarNumeros(this)">' +
      '<summary>+ Criar novo conjunto de anúncios</summary>' +
      '<div class="meta-conj-criar-corpo">' +
      '<p>Copia público e otimização do conjunto e também o criativo de um anúncio existente. <strong>Conjunto e anúncio serão criados PAUSADOS.</strong> Confira ambos na Meta antes de ativar.</p>' +
      '<p class="meta-conj-aviso-atribuicao">Para anúncios de WhatsApp otimizados para conversas, o novo conjunto usará atribuição por clique de <strong>1 dia</strong>, conforme a exigência atual da Meta. O conjunto original não será modificado.</p>' +
      '<form onsubmit="window.MetaConjuntosUI.criar(event,this,' + Number(campanhaId) +
        ')" oninput="window.MetaConjuntosUI.invalidar(this)" onchange="window.MetaConjuntosUI.invalidar(this)">' +
      '<label>Nome do novo conjunto<input name="nome" required minlength="3" maxlength="120" ' +
      'placeholder="Ex.: DIHOR Suplementos — WhatsApp 0205"></label>' +
      '<label>Copiar configurações deste conjunto<select name="conjunto_origem_id" required onchange="window.MetaConjuntosUI.atualizarAnuncios(this.form)">' +
      '<option value="">Selecione um conjunto existente</option>' +
      conjuntos.filter(x => x.destino === "WHATSAPP").map(x =>
        '<option value="' + esc(x.id) + '">' + esc(x.nome || x.id) + '</option>').join("") +
      '</select></label>' +
      '<label>Anúncio a ser copiado<select name="anuncio_origem_id" required>' +
      '<option value="">Escolha um conjunto primeiro</option></select></label>' +
      '<label>WhatsApp de destino<select name="whatsapp_numero_id" required data-numeros>' +
      '<option value="">Carregando números...</option></select></label>' +
      (campanha.cbo ? '<p>Orçamento controlado na campanha. O valor total não será alterado.</p>' :
        '<label>Orçamento diário deste conjunto (R$)<input name="orcamento" type="number" min="1" step="0.01" required placeholder="Ex.: 25.00"></label>' +
        '<p>Atenção: ao ativar este conjunto, o orçamento poderá somar ao dos demais conjuntos.</p>') +
      '<button type="button" class="meta-conj-validar-btn" onclick="window.MetaConjuntosUI.validar(event,this.form,' +
      Number(campanhaId) + ')">Validar configuração na Meta (não cria)</button>' +
      '<button type="submit" class="meta-conj-criar-btn" disabled>Criar conjunto + anúncio PAUSADOS</button>' +
      '<div class="meta-conj-feedback" role="status"></div></form>' +
      '<p>Caso a Meta não permita copiar um criativo específico, nenhuma campanha ou anúncio atual será alterado. Se o conjunto tiver sido criado, permanecerá pausado.</p>' +
      '</div></details>';
    return s;
  }

  // Um novo conjunto pode ser criado mesmo se a Meta recusar o anúncio.
  // Esta ação reaproveita o conjunto PAUSADO e não altera seu orçamento.
  function montarCompletarAnuncios(conjuntos,campanhaId) {
    const pendentes=conjuntos.filter(x=>
      x.status==="PAUSED" && x.destino==="WHATSAPP" &&
      x.numero_whatsapp && Array.isArray(x.anuncios) && x.anuncios.length===0);
    const fontes=conjuntos.flatMap(x=>(x.anuncios||[]).map(a=>({
      id:String(a.id),conjuntoId:String(x.id),
      rotulo:(a.nome||a.id)+" — "+(x.nome||x.id)
    })));
    if(!pendentes.length||!fontes.length)return "";
    const options=fontes.map(a=>
      '<option value="'+esc(a.conjuntoId+":"+a.id)+'">'+esc(a.rotulo)+'</option>').join("");
    return '<section class="meta-conj-recuperacao">'+
      '<h4>Concluir conjuntos que estão sem anúncio</h4>'+
      '<p>Estes conjuntos já foram criados na Meta. Aqui você copiará somente o anúncio, sem criar outro conjunto ou alterar o orçamento.</p>'+
      pendentes.map(x=>{
        const display=esc(x.nome||x.id);
        const alvoNumero=String(x.numero_whatsapp).replace(/\D/g,"");
        return '<details class="meta-conj-completar" data-target-id="'+esc(x.id)+'">'+
          '<summary>Adicionar anúncio ao conjunto <strong>'+display+'</strong> — WhatsApp final '+
           esc(alvoNumero.slice(-4))+'</summary>'+
          '<form data-campanha-id="'+Number(campanhaId)+'" '+
           'onsubmit="window.MetaConjuntosUI.copiarParaExistente(event,this)" '+
           'onchange="window.MetaConjuntosUI.invalidarConclusao(this)">'+
            '<p>Conjunto existente <strong>ID '+esc(x.id)+'</strong>, status PAUSADO. Sem anúncio no momento.</p>'+
            '<label>Escolha o anúncio original para copiar<select name="anuncio_origem" required>'+
              '<option value="">Selecione um anúncio existente</option>'+
              options+
            '</select></label>'+
            '<button type="button" class="meta-conj-validar-btn" onclick="window.MetaConjuntosUI.validarConclusao(event,this.form)">'+
              'Validar cópia na Meta (não cria)</button>'+
            '<button type="submit" class="meta-conj-criar-btn" disabled>'+
              'Copiar anúncio PAUSADO para este conjunto</button>'+
            '<div class="meta-conj-feedback" role="status"></div>'+
          '</form>'+
        '</details>';
      }).join("")+'</section>';
  }

  function detalhesCopiaExistente(form) {
    const conjuntoId=form.closest("[data-target-id]")?.dataset.targetId;
    const id=Number(form.dataset.campanhaId);
    const [fonte,anuncio]=String(form.elements.namedItem("anuncio_origem").value||"").split(":");
    if(!/^[0-9]+$/.test(String(conjuntoId))||!/^[0-9]+$/.test(fonte)||
       !/^[0-9]+$/.test(anuncio)||!Number.isSafeInteger(id)||id<=0)
      throw new Error("Selecione um anúncio de origem para continuar.");
    return {campanhaLocalId:id,conjuntoId,
      payload:{conjunto_origem_id:fonte,anuncio_origem_id:anuncio}};
  }
  function invalidarConclusao(form){
    delete form.dataset.assinaturaValida;
    const b=form.querySelector(".meta-conj-criar-btn");
    if(b)b.disabled=true;
    const m=form.querySelector(".meta-conj-feedback");
    if(m && m.dataset.estado==="sucesso")
      feedbackStatus(m,"aviso","O anúncio de origem mudou. Valide novamente.");
  }
  async function validarConclusao(ev,form){
    ev.preventDefault();ev.stopPropagation();
    if(form.dataset.ocupado==="1")return;
    const msg=form.querySelector(".meta-conj-feedback");
    invalidarConclusao(form);
    let req;
    try{req=detalhesCopiaExistente(form);}
    catch(e){feedbackStatus(msg,"aviso",e.message);return;}
    const btn=form.querySelector(".meta-conj-validar-btn");
    form.dataset.ocupado="1";btn.disabled=true;
    feedbackStatus(msg,"aviso","Consultando a Meta. Nenhum anúncio será criado durante esta validação...");
    try{
      const url=caminho(req.campanhaLocalId)+"/"+req.conjuntoId+"/copiar-anuncio/validar";
      const r=await fetch(url,{
        method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token()},
        body:JSON.stringify(req.payload)
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok||!data.ok||!data.validacao_sem_criacao)
        throw new Error(data.error||"A Meta não confirmou os dados do anúncio.");
      form.dataset.assinaturaValida=JSON.stringify(req);
      form.querySelector(".meta-conj-criar-btn").disabled=false;
      feedbackStatus(msg,"sucesso",data.aviso||"Validação aprovada; nenhum anúncio foi criado.");
    }catch(e){
      feedbackStatus(msg,"erro","Não foi possível validar: "+(e.message||"Erro na Meta"));
    }finally{btn.disabled=false;form.dataset.ocupado="0";}
  }
  async function copiarParaExistente(ev,form){
    ev.preventDefault();ev.stopPropagation();
    if(form.dataset.ocupado==="1")return;
    let req;
    try{req=detalhesCopiaExistente(form);}
    catch(e){alert(e.message);return;}
    if(form.dataset.assinaturaValida!==JSON.stringify(req)){
      alert("Valide a cópia na Meta antes de criar o anúncio.");return;
    }
    if(!confirm("Copiar somente o anúncio para o conjunto JÁ EXISTENTE "+req.conjuntoId+
      "? O anúncio e o conjunto continuarão PAUSADOS. Nenhum orçamento será modificado."))return;
    const btn=form.querySelector(".meta-conj-criar-btn");
    const msg=form.querySelector(".meta-conj-feedback");
    form.dataset.ocupado="1";btn.disabled=true;
    feedbackStatus(msg,"aviso","Copiando somente o anúncio para o conjunto existente...");
    try{
      const url=caminho(req.campanhaLocalId)+"/"+req.conjuntoId+"/copiar-anuncio";
      const r=await fetch(url,{
        method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token()},
        body:JSON.stringify(req.payload)
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data.error||"A Meta recusou copiar o anúncio.");
      invalidarConclusao(form);
      const aviso=data.aviso||"A Meta respondeu sobre a cópia.";
      feedbackStatus(msg,data.parcial?"aviso":"sucesso",aviso+
        " Conjunto: "+data.conjunto_id+" — Anúncio: "+(data.anuncio_id||"não criado"));
      alert(aviso+"\nConjunto já existente: "+data.conjunto_id+
        "\nAnúncio: "+(data.anuncio_id||"não criado"));
      if(window.MetaOrcamentosUI?.recarregarEdicao)
        await window.MetaOrcamentosUI.recarregarEdicao(req.campanhaLocalId);
    }catch(e){
      invalidarConclusao(form);
      feedbackStatus(msg,"erro",(e.message||"Falha ao copiar anúncio")+
        " Não repita sem conferir primeiro a lista de anúncios na Meta.");
    }finally{
      btn.disabled=true;form.dataset.ocupado="0";
    }
  }

  function renderizarGestao(alvo, campanhaId, dados) {
    if (!alvo) return;
    const conjuntos = Array.isArray(dados?.conjuntos) ? dados.conjuntos : [];
    estados.set(Number(campanhaId),dados);
    alvo.dataset.campanhaId = String(campanhaId);
    alvo.innerHTML = montarCompletarAnuncios(conjuntos,campanhaId) +
      montarFormularioCriacao(conjuntos, dados.campanha || {}, campanhaId);
  }

  function renderizar(alvo, campanhaId, dados) {
    const conjuntos = Array.isArray(dados.conjuntos) ? dados.conjuntos : [];
    const campanha = dados.campanha || {};
    const orcamento = campanha.cbo
      ? 'Orçamento definido na campanha' +
        (campanha.orcamento_diario_centavos ? ': ' + valorCentavos(campanha.orcamento_diario_centavos) + '/dia' : "")
      : 'Orçamento individual por conjunto (ABO)';
    let s = '<div class="meta-conj-resumo">' + esc(orcamento) + ' · Período: últimos 30 dias</div>';
    s += conjuntos.map(htmlConjunto).join("") ||
      '<div class="meta-conj-vazio">A Meta não retornou conjuntos para esta campanha.</div>';
    if (dados.aviso_metricas) s += '<div class="meta-conj-aviso">' + esc(dados.aviso_metricas) + '</div>';
    alvo.innerHTML = s;
    const details = alvo.closest(".meta-conjuntos-campanha");
    if(details) details.dataset.campanhaId = String(campanhaId);
  }

  function atualizarAnuncios(formulario) {
    const details = formulario && formulario.closest("[data-campanha-id].meta-conjuntos-edicao");
    const localId = details && Number(details.dataset.campanhaId);
    const dados = estados.get(localId);
    const seletor = formulario && formulario.elements.namedItem("anuncio_origem_id");
    const origemId = formulario && formulario.elements.namedItem("conjunto_origem_id").value;
    if (!seletor) return;
    const conjunto = (dados?.conjuntos || []).find(c => String(c.id) === String(origemId));
    const anuncios = conjunto?.anuncios || [];
    seletor.innerHTML = '<option value="">Selecione o anúncio original</option>' +
      anuncios.map(a => '<option value="' + esc(a.id) + '">' + esc(a.nome || a.id) + '</option>').join("");
    if (!anuncios.length) {
      seletor.innerHTML = '<option value="">Este conjunto não possui anúncio para copiar</option>';
    }
  }

  async function carregarNumeros(details) {
    const seletor = details && details.querySelector("select[data-numeros]");
    if (!seletor || seletor.dataset.pronto === "1") return;
    try {
      const r = await fetch(API + "/whatsapp/numeros", {
        headers:{Authorization:"Bearer " + token()}
      });
      const dados = await r.json().catch(() => ({}));
      if (!r.ok || !dados.habilitado) throw new Error("Múltiplos números não estão habilitados");
      const nums = Array.isArray(dados.numeros) ? dados.numeros : [];
      const conectados = nums.filter(x => String(x.status).toLowerCase() === "conectado");
      seletor.innerHTML = '<option value="">Escolha um WhatsApp conectado</option>' +
        nums.map(x => {
          const conectado = String(x.status).toLowerCase() === "conectado";
          const botAtivo = x.bot_ativo === true;
          const rotulo = (x.display_name || "WhatsApp") + " — " + (x.numero || "") +
            (!conectado ? " (desconectado)" : botAtivo ? " (bot ligado)" : " (bot pausado)");
          return '<option value="' + esc(x.id) + '" data-bot-ativo="' + (botAtivo ? "1" : "0") +
            '" ' + (conectado ? "" : "disabled") + '>' + esc(rotulo) + '</option>';
        }).join("");
      seletor.dataset.pronto = "1";
      let aviso = details.querySelector(".meta-conj-aviso-numeros");
      if (!aviso) {
        aviso = document.createElement("p");
        aviso.className = "meta-conj-aviso-numeros";
        seletor.closest("label")?.insertAdjacentElement("afterend", aviso);
      }
      aviso.textContent = !conectados.length
        ? "Nenhum número WhatsApp conectado. Verifique suas conexões em WhatsApp Bot."
        : "Números conectados com bot pausado também aparecem. Se usar um deles, o cliente poderá chamar no WhatsApp, mas o atendimento automático só funcionará após ligar o bot.";
      if (!conectados.length) {
        seletor.innerHTML = '<option value="">Nenhum número WhatsApp conectado</option>';
      }
    } catch(e) {
      seletor.innerHTML = '<option value="">Indisponível: ' + esc(e.message) + '</option>';
    }
  }

  function camposParaMeta(formulario) {
    const nome = formulario.elements.namedItem("nome")?.value?.trim();
    const origem = formulario.elements.namedItem("conjunto_origem_id")?.value;
    const numeroId = formulario.elements.namedItem("whatsapp_numero_id")?.value;
    const anuncioId = formulario.elements.namedItem("anuncio_origem_id")?.value;
    const inputOrcamento = formulario.elements.namedItem("orcamento");
    const valor = inputOrcamento ? Math.round(Number(inputOrcamento.value) * 100) : null;
    if(!nome || nome.length < 3 || !origem || !numeroId || !anuncioId ||
       (inputOrcamento && (!Number.isSafeInteger(valor) || valor <= 0))) {
      throw new Error("Preencha o nome, conjunto de origem, anúncio, WhatsApp e orçamento válido.");
    }
    return { nome, conjunto_origem_id:origem, anuncio_origem_id:anuncioId,
      whatsapp_numero_id:Number(numeroId), orcamento_diario_centavos:valor };
  }

  // Mensagens semânticas: sucesso verde; atenção/pendência laranja; falha vermelha.
  function feedbackStatus(elemento, estado, mensagem) {
    if (!elemento) return;
    elemento.dataset.estado = estado;
    elemento.textContent = mensagem;
  }

  function invalidar(formulario) {
    if(!formulario) return;
    delete formulario.dataset.assinaturaValida;
    const criarBotao=formulario.querySelector(".meta-conj-criar-btn");
    if(criarBotao)criarBotao.disabled=true;
    const msg=formulario.querySelector(".meta-conj-feedback");
    if(msg && msg.dataset.validado==="1"){
      feedbackStatus(msg,"aviso","Dados alterados. Valide novamente antes de criar.");
      msg.dataset.validado="0";
    }
  }

  async function validar(ev,formulario,campanhaId) {
    ev.preventDefault();
    ev.stopPropagation();
    if(formulario.dataset.enviando==="1")return;
    const msg=formulario.querySelector(".meta-conj-feedback");
    const btn=formulario.querySelector(".meta-conj-validar-btn");
    invalidar(formulario);
    let dados;
    try {dados=camposParaMeta(formulario);}
    catch(e){feedbackStatus(msg,"aviso",e.message);return;}
    formulario.dataset.enviando="1";
    btn.disabled=true;
    feedbackStatus(msg,"aviso","Validando a configuração na Meta, sem criar conjuntos ou anúncios...");
    try {
      const resp=await fetch(caminho(campanhaId)+"/validar",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+token()},
        body:JSON.stringify(dados)
      });
      const resultado=await resp.json().catch(()=>({}));
      if(!resp.ok || !resultado.validacao_sem_criacao || !resultado.ok){
        throw new Error(resultado.error||"A Meta não confirmou a validação.");
      }
      formulario.dataset.assinaturaValida=JSON.stringify(dados);
      const btnCriar=formulario.querySelector(".meta-conj-criar-btn");
      if(btnCriar)btnCriar.disabled=false;
      msg.dataset.validado="1";
      feedbackStatus(msg,"sucesso","Validação concluída: "+(resultado.aviso||
        "A configuração do conjunto foi aceita pela Meta. Nenhum conjunto ou anúncio foi criado."));
    } catch(e){
      msg.dataset.validado="0";
      feedbackStatus(msg,"erro","Configuração rejeitada: "+(e.message||"Falha ao consultar a Meta."));
    } finally {
      formulario.dataset.enviando="0";btn.disabled=false;
    }
  }

  async function criar(ev, formulario, campanhaId) {
    ev.preventDefault();
    ev.stopPropagation();
    if (formulario.dataset.enviando === "1") return;
    const dados = estados.get(Number(campanhaId));
    if (!dados) return;
    let payload;
    try {payload=camposParaMeta(formulario);}
    catch(e){alert(e.message);return;}
    if(formulario.dataset.assinaturaValida!==JSON.stringify(payload)){
      alert("Valide primeiro os dados do conjunto na Meta, sem criar. Depois você poderá confirmar a criação.");
      return;
    }
    const nome=payload.nome;
    const opcaoSelecionada = formulario.elements.namedItem("whatsapp_numero_id").selectedOptions?.[0];
    const botPausado = opcaoSelecionada?.dataset?.botAtivo === "0";
    if (!confirm("Criar o conjunto '" + nome +
      "' e copiar o anúncio selecionado na Meta, ambos PAUSADOS? O anúncio atual permanecerá inalterado." +
      (botPausado ? "\n\nATENÇÃO: o bot do WhatsApp escolhido está PAUSADO. Antes de veicular, habilite o bot em WhatsApp Bot se quiser atendimento automático." : "") +
      "\n\nConfirme o destino antes de qualquer ativação.")) return;
    const btn = formulario.querySelector('button[type="submit"]');
    const feedback = formulario.querySelector(".meta-conj-feedback");
    formulario.dataset.enviando = "1";
    btn.disabled = true;
    feedbackStatus(feedback,"aviso","Enviando solicitação à Meta...");
    try {
      const r = await fetch(caminho(campanhaId), {
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer " + token()},
        body:JSON.stringify(payload)
      });
      const resultado = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(resultado.error || "Criação recusada");
      invalidar(formulario);
      const recado = resultado.parcial
        ? "ATENÇÃO: " + (resultado.aviso || "Criação parcialmente concluída.") +
          "\nNão repita a operação sem conferir primeiro os IDs na Meta."
        : "Conjunto e anúncio criados PAUSADOS. " +
          (resultado.numero_verificado ? "WhatsApp do conjunto confirmado." :
            "WhatsApp não confirmado: verifique o destino.") +
          "\nValide o botão na prévia da Meta antes de ativar.";
      alert(recado + (resultado.aviso_bot ? "\n\n" + resultado.aviso_bot : "") +
        "\nConjunto ID: " + (resultado.id || "?") +
        "\nAnúncio ID: " + (resultado.anuncio_id || "não criado"));
      if (window.MetaOrcamentosUI?.recarregarEdicao) {
        await window.MetaOrcamentosUI.recarregarEdicao(campanhaId);
      }
    } catch(e) {
      feedback.dataset.validado="0";
      feedbackStatus(feedback,"erro",e.message || "Falha ao criar o conjunto.");
      invalidar(formulario);
    } finally {
      formulario.dataset.enviando = "0";
      // Para segurança, não habilitar o botão de criação após falha sem nova validação.
      btn.disabled = true;
    }
  }
  window.MetaConjuntosUI = { carregar, carregarNumeros, atualizarAnuncios, criar, validar, invalidar, renderizarGestao,
    validarConclusao, copiarParaExistente, invalidarConclusao };
})();
